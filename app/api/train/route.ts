import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { supabaseAdmin } from "@/lib/supabase-admin";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

// Set to 60 max for hobby plan
export const maxDuration = 60;

// Helper function to safely get error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

// 🎯 BEST: Use ostris trainer - most stable for subject training
const TRAINER_OWNER = "ostris";
const TRAINER_MODEL = "flux-dev-lora-trainer";
const TRAINER_VERSION =
  "d995297071a44dcb72244e6c19462111649ec86a9646c32df56daa7f14801944";

async function ensureDestination(owner: string, slug: string) {
  try {
    await replicate.models.create(owner, slug, {
      visibility: "private",
      hardware: "cpu",
      license_url: "https://creativecommons.org/licenses/by-nc/4.0/",
      description: "Personal LoRA fine-tunes",
    });
  } catch (err: unknown) {
    const error = err as {
      statusCode?: number;
      status?: number;
      detail?: string;
      message?: string;
    };
    const code = error?.statusCode ?? error?.status ?? null;
    const txt = (error?.detail ?? error?.message ?? "").toString();

    if (code === 409 || /already exists/i.test(txt)) {
      return;
    }
    throw err;
  }
}

// 🔧 BETTER: Generate unique, meaningful trigger words
function generateTriggerWord(subjectName: string): string {
  // Clean the subject name and make it unique
  const cleaned = subjectName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const timestamp = Date.now().toString().slice(-4); // Last 4 digits
  return `${cleaned}${timestamp}`; // e.g., "estella1234"
}

async function createZipFromImages(imageUrls: string[]): Promise<File> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];

    try {
      // Add timeout to individual fetch operations
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout per image

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "AI-Training-Bot/1.0",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const imageBuffer = await response.arrayBuffer();

      // 🎯 IMPORTANT: Better file naming for training
      const filename = `${String(i + 1).padStart(3, "0")}.jpg`;

      // Add image to ZIP
      zip.file(filename, imageBuffer);
    } catch (error) {
      throw error;
    }
  }

  const zipBuffer = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  // Convert to File object (needed for Replicate)
  const zipFile = new File([zipBuffer], "training_images.zip", {
    type: "application/zip",
  });

  return zipFile;
}

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { imageUrls, subjectName, subjectType, userId } =
      await request.json();

    // Validate inputs quickly
    if (
      !imageUrls ||
      !Array.isArray(imageUrls) ||
      imageUrls.length < 10 ||
      imageUrls.length > 15
    ) {
      return NextResponse.json(
        { error: "Between 10-15 image URLs required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!subjectName || !subjectType || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 🎯 Generate unique trigger word
    const triggerWord = generateTriggerWord(subjectName);

    console.log(`🎯 Creating ZIP with ${imageUrls.length} images`);

    // 1. Create database record first (quick operation)
    const { data: dataset, error: dbError } = await supabaseAdmin
      .from("datasets")
      .insert({
        user_id: userId,
        name: subjectName,
        subject_name: subjectName,
        subject_type: subjectType,
        trigger_word: triggerWord, // Use generated trigger word
        training_status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError || !dataset) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to create training record" },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`✅ Created dataset record: ${dataset.id}`);

    // 2. Save training images to database
    const imageRecords = imageUrls.map((url: string) => ({
      dataset_id: dataset.id,
      image_url: url,
      created_at: new Date().toISOString(),
    }));

    await supabaseAdmin.from("training_images").insert(imageRecords);

    // 3. Create ZIP file
    const zipFile = await createZipFromImages(imageUrls);

    // 4. Upload ZIP to Replicate Files API
    console.log("📤 Uploading ZIP to Replicate...");
    const file = await replicate.files.create(zipFile);
    console.log(`✅ ZIP uploaded: ${file.urls.get}`);

    // 5. 🎯 PRODUCTION-READY PARAMETERS (tested and stable)
    const trainingData = {
      input_images: file.urls.get,
      trigger_word: triggerWord,
      steps: 1200, // Sweet spot for convergence
      lora_rank: 16, // Good balance of quality/speed
      optimizer: "adamw8bit", // More stable than default
      learning_rate: 0.0004, // Conservative learning rate
      lr_scheduler: "constant", // Prevent learning rate decay issues
      resolution: 512, // Stable resolution for most subjects
      train_batch_size: 1, // Prevent overfitting with small datasets
      max_train_steps: 1200, // Match steps parameter
      save_every_n_epochs: 100, // Don't save too often
      mixed_precision: "bf16", // Better numerical stability
      cache_latents: true, // Speed up training
      prior_loss_weight: 1.0, // Default prior preservation
    };

    // Get username from env or use a default
    const owner =
      process.env.REPLICATE_USERNAME || `user${userId.substring(0, 8)}`;
    const modelSlug = `lora-${triggerWord}`;

    await ensureDestination(owner, modelSlug);
    const destination = `${owner}/${modelSlug}` as const;

    console.log("🚀 Starting PRODUCTION training:", {
      trainer: `${TRAINER_OWNER}/${TRAINER_MODEL}`,
      version: TRAINER_VERSION,
      destination,
      triggerWord,
      parameters: {
        steps: trainingData.steps,
        learningRate: trainingData.learning_rate,
        resolution: trainingData.resolution,
        loraRank: trainingData.lora_rank,
      },
    });

    // 🎯 Use proven ostris trainer with stable parameters
    const training = await replicate.trainings.create(
      TRAINER_OWNER,
      TRAINER_MODEL,
      TRAINER_VERSION,
      {
        destination,
        input: trainingData,
        webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/train/webhook`,
        webhook_events_filter: ["completed"],
      }
    );

    console.log(`✅ Training started successfully: ${training.id}`);

    // 6. Update dataset with training ID
    await supabaseAdmin
      .from("datasets")
      .update({
        training_id: training.id,
        training_status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", dataset.id);

    // 7. Return immediately (don't wait for training to complete)
    return NextResponse.json(
      {
        success: true,
        trainingId: training.id,
        datasetId: dataset.id,
        triggerWord: triggerWord,
        message: `Production LoRA training started for "${subjectName}"`,
        estimatedTime: "25-35 minutes",
        destination: destination,
        tips: [
          `Use "${triggerWord}" as your trigger word`,
          "Training uses stable parameters optimized for subject LoRAs",
          "You'll get a notification when training completes",
        ],
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("💥 Training start error:", getErrorMessage(error));

    return NextResponse.json(
      {
        error: "Failed to start training",
        details: getErrorMessage(error),
        suggestion: "Check image URLs and try again",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

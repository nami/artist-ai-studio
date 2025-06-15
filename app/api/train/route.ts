import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { supabaseAdmin } from "@/lib/supabase-admin";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

// Try the fast trainer first (mentioned in multiple sources as more stable)
const TRAINER_OWNER = "replicate";
const TRAINER_MODEL = "fast-flux-trainer";

async function ensureDestination(owner: string, slug: string) {
  try {
    await replicate.models.create(owner, slug, {
      visibility: "private",
      hardware: "cpu",
      license_url: "https://creativecommons.org/licenses/by-nc/4.0/",
      description: "Personal LoRA fine-tunes",
    });
    console.log(`↳ created model repo ${owner}/${slug}`);
  } catch (err: any) {
    const code = err?.statusCode ?? err?.status ?? null;
    const txt = (err?.detail ?? err?.message ?? "").toString();

    if (code === 409 || /already exists/i.test(txt)) {
      console.log(`↳ repo ${owner}/${slug} already exists – continuing`);
      return;
    }
    throw err;
  }
}

async function createZipFromImages(imageUrls: string[]): Promise<File> {
  console.log("📦 Creating ZIP file from images...");
  
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    console.log(`📥 Processing image ${i + 1}/${imageUrls.length}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const imageBuffer = await response.arrayBuffer();
      const filename = `image_${String(i + 1).padStart(3, '0')}.jpg`;
      
      // Add image to ZIP
      zip.file(filename, imageBuffer);
      
    } catch (error) {
      console.error(`Failed to process image ${i + 1}:`, error);
      throw error;
    }
  }

  console.log("🔄 Generating ZIP buffer...");
  const zipBuffer = await zip.generateAsync({ 
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
  
  // Convert to File object (needed for Replicate)
  const zipFile = new File([zipBuffer], 'training_images.zip', { 
    type: 'application/zip' 
  });
  
  console.log(`✅ ZIP created: ${zipFile.size} bytes`);
  return zipFile;
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrls, subjectName, subjectType, userId } = await req.json();

    if (!imageUrls?.length || !subjectName || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Use up to 20 images for better training results
    const limitedImageUrls = imageUrls.slice(0, 20);
    
    console.log(`🎯 Creating ZIP with ${limitedImageUrls.length} images`);

    // Create dataset record
    const { data: dataset, error: dbErr } = await supabaseAdmin
      .from("datasets")
      .insert({
        user_id: userId,
        name: `${subjectName} Model`,
        subject_name: subjectName,
        subject_type: subjectType,
        trigger_word: "TOK",
        training_status: "processing",
      })
      .select()
      .single();

    if (dbErr) throw dbErr;

    // Save training images
    await supabaseAdmin.from("training_images").insert(
      limitedImageUrls.map((url: string) => ({
        dataset_id: dataset.id,
        image_url: url,
      }))
    );

    // Create ZIP file
    const zipFile = await createZipFromImages(limitedImageUrls);

    // Upload ZIP to Replicate Files API (same as manual website)
    console.log("📤 Uploading ZIP to Replicate...");
    const file = await replicate.files.create(zipFile);
    console.log(`✅ ZIP uploaded: ${file.urls.get}`);

    // Use parameters exactly like the manual website
    const trainingData = {
      input_images: file.urls.get,  // ZIP file URL (like manual)
      trigger_word: "TOK",
      lora_type: "subject",          // This parameter is used by manual website
      steps: 1000,
    };

    const owner = (process.env.REPLICATE_USERNAME || "").trim();
    if (!owner) throw new Error("REPLICATE_USERNAME env var is not set");
    
    const modelSlug = `flux-zip-${Date.now()}`;
    await ensureDestination(owner, modelSlug);
    const destination = `${owner}/${modelSlug}` as const;

    console.log("🚀 Starting training with ZIP (like manual website):", {
      trainer: `${TRAINER_OWNER}/${TRAINER_MODEL}`,
      destination,
      zipUrl: file.urls.get,
      parameters: trainingData
    });

    // Define versions outside try blocks to fix TypeScript scope issues
    const fastTrainerVersion = "8b10794665aed907bb98a1a5324cd1d3a8bea0e9b31e65210967fb9c9e2e08ed";
    const ostrisVersion = "d995297071a44dcb72244e6c19462111649ec86a9646c32df56daa7f14801944";
    
    let training;
    
    // Try fast trainer with specific version first
    try {
      console.log(`🚀 Trying fast trainer version: ${fastTrainerVersion}`);
      
      training = await replicate.trainings.create(
        TRAINER_OWNER,
        TRAINER_MODEL,
        fastTrainerVersion,
        {
          destination,
          input: trainingData,
        }
      );
      console.log(`✅ Fast trainer worked: ${training.id}`);
      
    } catch (fastTrainerError: unknown) {
      console.log("⚠️ Fast trainer failed, trying ostris trainer...");
      console.log("Fast trainer error:", fastTrainerError instanceof Error ? fastTrainerError.message : String(fastTrainerError));
      
      // Try ostris trainer with specific working version
      try {
        console.log(`🚀 Trying ostris trainer version: ${ostrisVersion}`);
        
        const { lora_type, ...ostrisData } = trainingData; // Remove lora_type for ostris
        
        training = await replicate.trainings.create(
          "ostris",
          "flux-dev-lora-trainer",
          ostrisVersion,
          {
            destination,
            input: ostrisData,
          }
        );
        console.log(`✅ Ostris trainer worked: ${training.id}`);
        
      } catch (ostrisError: unknown) {
        console.log("⚠️ Ostris trainer also failed, trying with individual URLs...");
        console.log("Ostris error:", ostrisError instanceof Error ? ostrisError.message : String(ostrisError));
        
        // Last resort: Try to extract individual images from ZIP and use as URLs
        const { lora_type, ...individualData } = trainingData;
        individualData.input_images = limitedImageUrls; // Use original URLs
        
        training = await replicate.trainings.create(
          "ostris",
          "flux-dev-lora-trainer",
          ostrisVersion,
          {
            destination,
            input: individualData,
          }
        );
        console.log(`✅ Individual URLs worked: ${training.id}`);
      }
    }

    // Update dataset with training ID
    await supabaseAdmin
      .from("datasets")
      .update({ 
        training_id: training.id, 
        model_version: destination,
        trigger_word: "TOK"
      })
      .eq("id", dataset.id);

    return NextResponse.json(
      { 
        datasetId: dataset.id, 
        trainingId: training.id, 
        status: "processing",
        message: `ZIP-based training started with ${limitedImageUrls.length} images`
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("💥 ZIP training error:", err);
    
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    
    return NextResponse.json(
      { 
        error: "Failed to start ZIP training", 
        details: errorMessage,
      }, 
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 300;
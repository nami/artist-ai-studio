import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log("🔍 Fetching training data for:", id);

    // Fetch dataset by training_id
    const { data: datasetData, error: datasetError } = await supabaseAdmin
      .from("datasets")
      .select("*")
      .eq("training_id", id)
      .single();

    if (datasetError) {
      console.error("Dataset fetch error:", datasetError);

      // Additional debugging - check if the ID exists as a dataset ID instead
      const { data: datasetByIdData, error: datasetByIdError } =
        await supabaseAdmin
          .from("datasets")
          .select("id, training_id, training_status, subject_name")
          .eq("id", id)
          .single();

      if (datasetByIdData) {
        console.warn("⚠️ Found dataset by ID instead of training_id:", {
          id: datasetByIdData.id,
          training_id: datasetByIdData.training_id,
          status: datasetByIdData.training_status,
          subject: datasetByIdData.subject_name,
        });
      } else {
        console.error("❌ Dataset not found by ID either:", datasetByIdError);
      }

      return NextResponse.json(
        { error: "Training not found" },
        { status: 404 }
      );
    }

    // Fetch training images
    const { data: imagesData, error: imagesError } = await supabaseAdmin
      .from("training_images")
      .select("*")
      .eq("dataset_id", datasetData.id);

    if (imagesError) {
      console.error("Images fetch error:", imagesError);
      return NextResponse.json(
        { error: "Failed to load training images" },
        { status: 500 }
      );
    }

    // Convert to the format expected by TrainingDashboard
    const trainingImages = imagesData.map((img, index) => ({
      id: img.id,
      preview: img.image_url,
      name: `Image ${index + 1}`,
    }));

    const imageUrls = imagesData.map((img) => img.image_url);

    console.log("✅ Training data loaded:", {
      dataset: datasetData.subject_name,
      imageCount: imageUrls.length,
    });

    // 🆕 ADD TRAINING STATUS CHECK
    const trainingStatus = {
      status: datasetData.training_status || "unknown",
      progress: 0,
      model_url: datasetData.model_version || null,
      error: datasetData.error_message || null,
      started_at: datasetData.created_at,
      completed_at: datasetData.completed_at,
    };

    // Calculate progress based on status
    switch (trainingStatus.status) {
      case "starting":
        trainingStatus.progress = 10;
        break;
      case "processing":
      case "training":
        trainingStatus.progress = 50;
        break;
      case "completed":
        trainingStatus.progress = 100;
        break;
      case "failed":
        trainingStatus.progress = 0;
        break;
      default:
        trainingStatus.progress = 25;
    }

    // 🆕 CHECK LIVE STATUS FROM REPLICATE (if still training)
    if (
      trainingStatus.status !== "completed" &&
      trainingStatus.status !== "succeeded" &&
      trainingStatus.status !== "failed" &&
      process.env.REPLICATE_API_TOKEN
    ) {
      try {
        console.log("🌐 Checking live status from Replicate...");
        const replicateResponse = await fetch(
          `https://api.replicate.com/v1/predictions/${id}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
            },
          }
        );

        if (replicateResponse.ok) {
          const replicateData = await replicateResponse.json();
          console.log(`📊 Replicate status: ${replicateData.status}`);

          // Update status if different
          if (replicateData.status !== trainingStatus.status) {
            console.log(
              `🔄 Updating status: ${trainingStatus.status} → ${replicateData.status}`
            );

            // Replicate uses "succeeded"; normalise to our internal "completed"
            const normalizedStatus =
              replicateData.status === "succeeded"
                ? "completed"
                : replicateData.status;

            const updates: {
              training_status: string;
              updated_at: string;
              model_version?: string;
              completed_at?: string;
              error_message?: string;
            } = {
              training_status: normalizedStatus,
              updated_at: new Date().toISOString(),
            };

            if (replicateData.status === "succeeded" || replicateData.status === "completed") {
              updates.model_version = replicateData.output;
              updates.completed_at = new Date().toISOString();
            }

            if (replicateData.status === "failed") {
              updates.error_message = replicateData.error || "Training failed";
            }

            // Update database
            await supabaseAdmin
              .from("datasets")
              .update(updates)
              .eq("training_id", id);

            // Update our response
            trainingStatus.status = replicateData.status;
            trainingStatus.model_url = replicateData.output;
            trainingStatus.error = replicateData.error;
            trainingStatus.completed_at = replicateData.completed_at;

            // Recalculate progress
            switch (replicateData.status) {
              case "starting":
                trainingStatus.progress = 10;
                break;
              case "processing":
                trainingStatus.progress = 50;
                break;
              case "completed":
                trainingStatus.progress = 100;
                break;
              case "failed":
                trainingStatus.progress = 0;
                break;
              default:
                trainingStatus.progress = 25;
            }
          }
        }
      } catch (replicateError) {
        console.warn(
          "⚠️ Could not fetch live status from Replicate:",
          replicateError
        );
        // Continue with DB status
      }
    }

    // 🆕 RETURN BOTH TRAINING DATA AND STATUS
    return NextResponse.json({
      // Original data (for backward compatibility)
      dataset: datasetData,
      trainingImages,
      imageUrls,

      // 🆕 New training status fields (for polling)
      id: id,
      status: trainingStatus.status,
      progress: trainingStatus.progress,
      model_url: trainingStatus.model_url,
      error: trainingStatus.error,
      logs: null, // Add if you track logs
      started_at: trainingStatus.started_at,
      completed_at: trainingStatus.completed_at,

      // Additional useful fields
      subjectName: datasetData.subject_name,
      imageCount: imageUrls.length,
    });
  } catch (err) {
    console.error("💥 Failed to fetch training data:", err);

    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to fetch training data", details: errorMessage },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";

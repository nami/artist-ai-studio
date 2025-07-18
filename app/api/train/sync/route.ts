import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { trainingId } = await request.json();

    if (!trainingId) {
      return NextResponse.json(
        { error: "Training ID required" },
        { status: 400 }
      );
    }

    // Find the dataset by training_id
    const { data: dataset, error: findError } = await supabaseAdmin
      .from("datasets")
      .select("*")
      .eq("training_id", trainingId)
      .single();

    if (findError || !dataset) {
      console.error(
        "❌ Dataset not found for training:",
        trainingId,
        findError
      );
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    // Check status from Replicate directly
    const replicateResponse = await fetch(
      `https://api.replicate.com/v1/trainings/${trainingId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        },
      }
    );

    if (!replicateResponse.ok) {
      console.error("❌ Failed to fetch training status from Replicate");
      return NextResponse.json(
        { error: "Failed to fetch training status" },
        { status: 500 }
      );
    }

    const replicateData = await replicateResponse.json();
    console.log("📊 Replicate training status:", replicateData.status);

    // Prepare update data
    const updateData: {
      training_status: string;
      updated_at: string;
      model_version?: string;
      completed_at?: string;
      error_message?: string;
    } = {
      training_status: replicateData.status,
      updated_at: new Date().toISOString(),
    };

    // Handle different training statuses
    if (replicateData.status === "succeeded") {
      if (replicateData.output) {
        // Extract model version from output
        let modelVersion = null;

        if (typeof replicateData.output === "string") {
          modelVersion = replicateData.output;
        } else if (Array.isArray(replicateData.output)) {
          modelVersion = replicateData.output[0];
        } else if (
          typeof replicateData.output === "object" &&
          replicateData.output !== null
        ) {
          // Try different possible fields
          modelVersion =
            replicateData.output.model ||
            replicateData.output.model_version ||
            replicateData.output.version ||
            replicateData.output.url ||
            replicateData.output.destination ||
            JSON.stringify(replicateData.output);
        }

        updateData.model_version = modelVersion;
        updateData.training_status = "completed";
        updateData.completed_at = new Date().toISOString();
        updateData.error_message = undefined;
      } else {
        updateData.training_status = "failed";
        updateData.error_message =
          "Training completed but no model output received";
      }
    } else if (
      replicateData.status === "failed" ||
      replicateData.status === "canceled"
    ) {
      updateData.training_status = "failed";
      updateData.error_message =
        replicateData.error || `Training ${replicateData.status}`;
    } else if (
      replicateData.status === "processing" ||
      replicateData.status === "starting"
    ) {
      updateData.training_status = "processing";
    }

    // Update the database
    const { error: updateError } = await supabaseAdmin
      .from("datasets")
      .update(updateData)
      .eq("id", dataset.id);

    if (updateError) {
      console.error("💥 Failed to update dataset:", updateError);
      throw updateError;
    }

    console.log("✅ Training status synced:", {
      trainingId,
      status: updateData.training_status,
      modelVersion: updateData.model_version,
    });

    return NextResponse.json({
      success: true,
      message: "Training status synced successfully",
      datasetId: dataset.id,
      subjectName: dataset.subject_name,
      status: updateData.training_status,
      modelVersion: updateData.model_version || null,
      replicateStatus: replicateData.status,
      replicateOutput: replicateData.output,
    });
  } catch (error) {
    console.error("💥 Sync error:", error);
    return NextResponse.json(
      {
        error: "Failed to sync training status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";

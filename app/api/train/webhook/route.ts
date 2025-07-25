import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const trainingId = body.id;
    const status = body.status;
    const output = body.output;
    const error = body.error;
    const logs = body.logs;

    if (!trainingId) {
      console.error("❌ No training ID in webhook");
      return NextResponse.json({ error: "No training ID" }, { status: 400 });
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

    // Prepare update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Handle different training statuses
    if (status === "succeeded" || status === "completed") {
      if (output) {
        // 🔧 IMPROVED: Handle different output formats from fast-flux-trainer
        let modelVersion = null;

        if (typeof output === "string") {
          // Direct string output (most common)
          modelVersion = output;
        } else if (Array.isArray(output)) {
          // Array output - use first item
          modelVersion = output[0];
        } else if (typeof output === "object" && output !== null) {
          // Object output - try different possible fields
          if (output.model) {
            modelVersion = output.model;
          } else if (output.model_version) {
            modelVersion = output.model_version;
          } else if (output.version) {
            modelVersion = output.version;
          } else if (output.url) {
            modelVersion = output.url;
          } else if (output.destination) {
            modelVersion = output.destination;
          } else {
            // Try to find any string field that looks like a model reference
            const possibleFields = Object.values(output).filter(
              (value) =>
                typeof value === "string" &&
                (value.includes("/") || value.includes(":"))
            );
            if (possibleFields.length > 0) {
              modelVersion = possibleFields[0];
            } else {
              // Last resort: stringify the entire object
              modelVersion = JSON.stringify(output);
            }
          }
        }

        if (modelVersion) {
          updateData.model_version = modelVersion;
          updateData.training_status = "completed";
          updateData.completed_at = new Date().toISOString();
          updateData.error_message = null; // Clear any previous errors
        } else {
          console.warn("⚠️ Could not extract model version from output");
          updateData.training_status = "failed";
          updateData.error_message = `Training completed but could not parse model output: ${JSON.stringify(
            output
          )}`;
        }
      } else {
        console.warn("⚠️ Training succeeded but no output received");
        updateData.training_status = "failed";
        updateData.error_message =
          "Training completed but no model output received";
      }
    } else if (status === "failed" || status === "canceled") {
      updateData.training_status = "failed";
      updateData.error_message = error || `Training ${status}`;

      if (logs) {
        // Store logs as JSON string if it's an object
        updateData.logs =
          typeof logs === "object" ? JSON.stringify(logs) : logs;
      }
    } else if (status === "processing" || status === "starting") {
      updateData.training_status = "processing"; // Normalize to 'processing'

      if (logs) {
        updateData.logs =
          typeof logs === "object" ? JSON.stringify(logs) : logs;
      }
    } else {
      updateData.training_status = "processing"; // Default to processing for unknown statuses
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

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      datasetId: dataset.id,
      subjectName: dataset.subject_name,
      status: updateData.training_status,
      modelVersion: updateData.model_version || null,
      debugInfo: {
        originalOutput: output,
        extractedModelVersion: updateData.model_version,
        outputType: typeof output,
      },
    });
  } catch (error) {
    console.error("💥 Webhook processing error:", error);

    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({
    message: "Training webhook endpoint",
    status: "active",
    timestamp: new Date().toISOString(),
    note: "POST training data here from Replicate webhooks",
  });
}

export const runtime = "nodejs";

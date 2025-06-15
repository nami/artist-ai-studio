import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { supabaseAdmin } from "@/lib/supabase-admin";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log(`🔍 Checking status for training: ${id}`);

    // Get training status from Replicate
    const training = await replicate.trainings.get(id);

    console.log(`📊 Replicate status: ${training.status}`);
    console.log(`📊 Training details:`, {
      id: training.id,
      status: training.status,
      started_at: training.started_at,
      completed_at: training.completed_at,
      error: training.error,
      output: training.output ? 'has output' : 'no output'
    });

    // Log error if training failed
    if (training.error) {
      console.log("Replicate failure log:", training.error);
    }

    // Get dataset from database
    const { data: dataset, error: fetchError } = await supabaseAdmin
      .from("datasets")
      .select("*")
      .eq("training_id", id)
      .single();

    if (fetchError) {
      console.log("⚠️ Could not find dataset for training ID:", id);
      // Still return the status even if we can't find the dataset
      return NextResponse.json({
        status: training.status,
        error: training.error ?? null,
        replicate_status: training.status,
        message: "Training status retrieved, but dataset not found in database"
      });
    }

    // Determine the training status and update database accordingly
    let finalStatus = "processing";
    let updateData: any = {
      training_status: "processing"
    };

    if (training.status === "succeeded") {
      finalStatus = "completed";
      updateData = {
        training_status: "completed",
        completed_at: new Date().toISOString()
      };
      
      console.log(`✅ Training completed successfully! Model: ${dataset.model_version}`);
      
    } else if (training.status === "failed" || training.status === "canceled") {
      finalStatus = "failed";
      updateData = {
        training_status: "failed",
        error_message: training.error || "Training failed"
      };
      
      console.log(`❌ Training failed with status: ${training.status}`);
      
    } else if (training.status === "processing" || training.status === "starting") {
      finalStatus = "processing";
      updateData = {
        training_status: "processing"
      };
      
      console.log(`⏳ Training still in progress: ${training.status}`);
    }

    // Update the dataset status in database
    const { error: updateError } = await supabaseAdmin
      .from("datasets")
      .update(updateData)
      .eq("training_id", id);

    if (updateError) {
      console.error("Failed to update dataset status:", updateError);
    } else {
      console.log(`📝 Updated dataset status to: ${finalStatus}`);
    }

    // Return comprehensive status
    return NextResponse.json({
      status: finalStatus,
      replicate_status: training.status,
      error: training.error ?? null,
      dataset_id: dataset.id,
      model_version: dataset.model_version,
      trigger_word: dataset.trigger_word,
      started_at: training.started_at,
      completed_at: training.completed_at,
      message: finalStatus === "completed" 
        ? `Training completed! Model ready at: ${dataset.model_version}`
        : finalStatus === "failed"
        ? `Training failed: ${training.error || "Unknown error"}`
        : "Training is still in progress..."
    });

  } catch (err) {
    console.error("Replicate status error:", err);
    
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    
    return NextResponse.json(
      { 
        error: "Failed to fetch training status",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 30;
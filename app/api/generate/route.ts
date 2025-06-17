// app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { supabaseAdmin } from "@/lib/supabase-admin";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      modelId, // Updated to match your frontend
      userId,
      steps = 28,
      guidance = 3.5,
      seed,
    } = body;

    console.log("🚀 Starting generation...");

    let model: `${string}/${string}` = "black-forest-labs/flux-schnell";
    let finalPrompt = prompt;
    let isUsingCustomModel = false;

    // Handle custom model
    if (modelId && modelId !== "base") {
      const { data: dataset } = await supabaseAdmin
        .from("datasets")
        .select("model_version, trigger_word, training_status")
        .eq("id", modelId)
        .single();

      if (dataset?.model_version && dataset?.training_status === "completed") {
        model = dataset.model_version;
        isUsingCustomModel = true;
        
        if (dataset.trigger_word && !finalPrompt.includes(dataset.trigger_word)) {
          finalPrompt = `${dataset.trigger_word} ${finalPrompt}`;
        }
      }
    }

    // Prepare input
    let input: any = {
      prompt: finalPrompt,
      num_outputs: 1,
      aspect_ratio: "1:1",
      output_format: "webp",
      output_quality: 80,
    };

    if (isUsingCustomModel) {
      input.guidance_scale = guidance;
      input.num_inference_steps = Math.min(steps, 28);
      input.lora_scale = 1.0;
    } else {
      input.guidance_scale = 0;
      input.num_inference_steps = Math.min(steps, 4);
    }

    if (seed) input.seed = seed;

    // Decide: async vs sync based on model and environment
    const useAsync = isUsingCustomModel || process.env.NODE_ENV === 'production';

    if (useAsync) {
      // ASYNC: Start prediction, don't wait
      const webhookUrl = process.env.NODE_ENV === 'production' 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/generate/webhook`
        : undefined;

      let prediction;
      if (isUsingCustomModel) {
        const createParams: any = {
          version: model.includes(":") ? model.split(":")[1] : model,
          input,
        };
        
        // Only add webhook params if we have a webhook URL
        if (webhookUrl) {
          createParams.webhook = webhookUrl;
          createParams.webhook_events_filter = ["completed"];
        }
        
        prediction = await replicate.predictions.create(createParams);
      } else {
        const createParams: any = {
          model,
          input,
        };
        
        // Only add webhook params if we have a webhook URL
        if (webhookUrl) {
          createParams.webhook = webhookUrl;
          createParams.webhook_events_filter = ["completed"];
        }
        
        prediction = await replicate.predictions.create(createParams);
      }

      // Save pending generation
      const { data: generation } = await supabaseAdmin
        .from("generations")
        .insert({
          user_id: userId,
          dataset_id: modelId === "base" ? null : modelId,
          prompt: finalPrompt,
          image_url: "",
          prediction_id: prediction.id,
          status: "generating",
          settings: {
            steps: input.num_inference_steps,
            guidance: input.guidance_scale,
            model,
            isUsingCustomModel,
            seed: seed || null,
          },
        })
        .select()
        .single();

      return NextResponse.json({
        generationId: generation?.id,
        predictionId: prediction.id,
        status: "generating",
        estimatedTime: isUsingCustomModel ? "2-3 minutes" : "30-60 seconds"
      });

    } else {
      // SYNC: Wait for completion (for base model on localhost)
      const output = await replicate.run(model, { input });
      const imageUrl = Array.isArray(output) ? output[0] : output;

      // Save completed generation
      const { data: generation } = await supabaseAdmin
        .from("generations")
        .insert({
          user_id: userId,
          dataset_id: null,
          prompt: finalPrompt,
          image_url: imageUrl,
          status: "completed",
          settings: {
            steps: input.num_inference_steps,
            guidance: input.guidance_scale,
            model,
            isUsingCustomModel: false,
            seed: seed || null,
          },
        })
        .select()
        .single();

      return NextResponse.json({
        imageUrl,
        generationId: generation?.id,
        status: "completed"
      });
    }

  } catch (error) {
    console.error("💥 Generation error:", error);
    return NextResponse.json(
      { error: `Failed to generate: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

export const maxDuration = 30;
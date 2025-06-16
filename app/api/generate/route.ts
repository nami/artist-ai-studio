// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { supabaseAdmin } from '@/lib/supabase-admin';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      prompt, 
      datasetId, 
      userId, 
      style, 
      negativePrompt,
      controlImage,
      controlType,
      composition,
      steps = 28,
      guidance = 3.5,
      loraScale = 1.0
    } = body;

    console.log('🚀 Starting image generation...');
    console.log('📋 Input params:', { 
      prompt, 
      datasetId: !!datasetId, 
      userId: !!userId, 
      steps, 
      guidance, 
      loraScale 
    });

    let model: string = "black-forest-labs/flux-schnell";
    let finalPrompt = prompt;
    let isUsingCustomModel = false;
    
    // 🔥 FIXED: Model-specific parameter setup
    let input: any = {
      prompt: finalPrompt,
      num_outputs: 1,
      aspect_ratio: "1:1",
      output_format: "webp",
      output_quality: 80,
    };

    if (negativePrompt) {
      input.negative_prompt = negativePrompt;
    }

    // Handle custom trained model
    if (datasetId) {
      console.log('🎯 Looking up custom model for dataset:', datasetId);
      
      const { data: dataset } = await supabaseAdmin
        .from('datasets')
        .select('model_version, trigger_word, subject_name, training_status')
        .eq('id', datasetId)
        .single();

      console.log('🔍 DEBUGGING CUSTOM MODEL:');
      console.log('- dataset found:', !!dataset);
      console.log('- training_status:', dataset?.training_status);
      console.log('- model_version:', dataset?.model_version);
      console.log('- trigger_word:', dataset?.trigger_word);

      if (dataset?.model_version && dataset?.training_status === 'completed') {
        console.log('📋 ✅ Using trained model directly:', dataset.model_version);
        
        model = dataset.model_version;
        isUsingCustomModel = true;
        const triggerWord = dataset.trigger_word;
        
        if (triggerWord && !finalPrompt.includes(triggerWord)) {
          finalPrompt = `${triggerWord} ${finalPrompt}`;
        }
        
        console.log('✅ TRAINED MODEL DIRECT USAGE:');
        console.log('- Model:', model);
        console.log('- Final prompt:', finalPrompt);
      }
    }

    // 🔥 FIXED: Set parameters based on model type
    if (isUsingCustomModel) {
      // Custom trained model parameters
      input = {
        prompt: finalPrompt,
        num_outputs: 1,
        aspect_ratio: "1:1",
        guidance_scale: guidance,
        num_inference_steps: Math.min(steps, 28), // Custom models can handle more steps
        output_format: "webp",
        output_quality: 80,
        lora_scale: loraScale,
      };
      
      if (negativePrompt) {
        input.negative_prompt = negativePrompt;
      }
    } else {
      // Default flux-schnell parameters
      input = {
        prompt: finalPrompt,
        num_outputs: 1,
        aspect_ratio: "1:1",
        guidance_scale: 0, // flux-schnell requires guidance_scale = 0
        num_inference_steps: Math.min(steps, 4), // flux-schnell max 4 steps
        output_format: "webp",
        output_quality: 80,
      };
      
      // flux-schnell doesn't support negative prompts in the same way
      // Remove negative_prompt for schnell
    }

    // Add style and composition
    if (style && style !== '') {
      finalPrompt = `${finalPrompt}, ${style}`;
      input.prompt = finalPrompt;
    }

    if (composition && datasetId) {
      const compositionPrompts = {
        'sitting': 'sitting down, seated position',
        'standing': 'standing up, full body standing',
        'running': 'running, in motion, dynamic pose',
        'jumping': 'jumping in the air, mid-jump',
        'sleeping': 'sleeping, lying down, resting',
        'playing': 'playing, playful pose',
      };
      
      if (compositionPrompts[composition as keyof typeof compositionPrompts]) {
        finalPrompt = `${finalPrompt}, ${compositionPrompts[composition as keyof typeof compositionPrompts]}`;
        input.prompt = finalPrompt;
      }
    }

    console.log('🔍 FINAL GENERATION SETTINGS:');
    console.log('- model:', model);
    console.log('- isUsingCustomModel:', isUsingCustomModel);
    console.log('- final prompt:', input.prompt);
    console.log('- steps:', input.num_inference_steps);
    console.log('- guidance:', input.guidance_scale);
    if (isUsingCustomModel) console.log('- lora_scale:', input.lora_scale);

    // 🔥 FIXED: Better handling for different model types
    console.log('🚀 Creating prediction...');
    
    let imageUrl: string;
    
    if (isUsingCustomModel) {
      // For custom models, use predictions API for better control
      try {
        const prediction = await replicate.predictions.create({
          version: model.includes(':') ? model.split(':')[1] : model,
          input: input
        });
        
        console.log('📋 Prediction created:', prediction.id);
        
        // Wait for completion
        let finalPrediction = prediction;
        let attempts = 0;
        const maxAttempts = 60;
        
        while (finalPrediction.status !== 'succeeded' && finalPrediction.status !== 'failed' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          finalPrediction = await replicate.predictions.get(prediction.id);
          attempts++;
          console.log(`⏳ Prediction status: ${finalPrediction.status} (${attempts}/${maxAttempts})`);
        }
        
        if (finalPrediction.status === 'failed') {
          throw new Error(`Prediction failed: ${finalPrediction.error}`);
        }
        
        if (finalPrediction.status !== 'succeeded') {
          throw new Error('Prediction timed out');
        }
        
        console.log('📤 Final prediction output:', finalPrediction.output);
        
        if (Array.isArray(finalPrediction.output)) {
          imageUrl = finalPrediction.output[0];
        } else if (typeof finalPrediction.output === 'string') {
          imageUrl = finalPrediction.output;
        } else {
          throw new Error('Unexpected output format from prediction');
        }
        
      } catch (predictionError) {
        console.error('❌ Custom model prediction failed:', predictionError);
        throw predictionError;
      }
      
    } else {
      // For default models, use direct run method
      try {
        console.log('🏃 Using direct run for default model...');
        const output = await replicate.run(model as any, { input });
        console.log('📤 Direct run output:', output);
        
        if (Array.isArray(output)) {
          imageUrl = output[0];
        } else if (typeof output === 'string') {
          imageUrl = output;
        } else {
          throw new Error('Unexpected output format from direct run');
        }
        
      } catch (runError) {
        console.error('❌ Direct run failed:', runError);
        throw runError;
      }
    }

    // Validate URL
    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
      throw new Error(`Invalid image URL received: ${imageUrl}`);
    }

    console.log('📸 Using image URL:', imageUrl);

    // Save to database
    const { data: generation } = await supabaseAdmin
      .from('generations')
      .insert({
        user_id: userId,
        dataset_id: datasetId || null,
        prompt: finalPrompt,
        negative_prompt: negativePrompt,
        image_url: imageUrl,
        settings: { 
          style, 
          controlType, 
          composition, 
          steps: input.num_inference_steps,
          guidance: input.guidance_scale,
          model: model,
          lora_scale: input.lora_scale || null,
          isUsingCustomModel
        }
      })
      .select()
      .single();

    console.log('✅ Image generated successfully:', imageUrl);

    return NextResponse.json({
      imageUrl,
      generationId: generation?.id
    });
    
  } catch (error) {
    console.error('💥 Generation error:', error);
    return NextResponse.json(
      { error: `Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 300;
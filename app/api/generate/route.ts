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
      steps,
      guidance,
      seed,
      width = 512,
      height = 512,
    } = body;

    console.log('🚀 Starting image generation...');

    let model = 'black-forest-labs/flux-schnell';
    let finalPrompt = prompt;
    let isUsingCustomModel = false;

    let input: Record<string, unknown> = {
      prompt: finalPrompt,
      num_outputs: 1,
      guidance_scale: guidance || 0,
      num_inference_steps: steps || 4,
      width,
      height,
    };

    if (seed !== undefined) {
      input.seed = seed;
    }

    // If user selected a custom model
    if (datasetId) {
      console.log(`🎯 Looking up custom model for dataset: ${datasetId}`);
      
      const { data: dataset } = await supabaseAdmin
        .from('datasets')
        .select('model_version, trigger_word, subject_name, training_status')
        .eq('id', datasetId)
        .eq('user_id', userId)
        .single();

      if (dataset && dataset.training_status === 'completed' && dataset.model_version) {
        console.log(`📋 Found model: ${dataset.model_version}`);
        console.log(`🎯 Trigger word: ${dataset.trigger_word}`);

        // Use FLUX-DEV as base model for LoRA
        model = 'black-forest-labs/flux-dev';
        isUsingCustomModel = true;

        // Add LoRA parameters
        input.lora = dataset.model_version;
        input.lora_scale = 1.0;

        // Add trigger word to prompt
        if (dataset.trigger_word) {
          finalPrompt = `${dataset.trigger_word} ${prompt}`;
        }

        // Update settings for FLUX-DEV + LoRA
        input.prompt = finalPrompt;
        input.guidance_scale = guidance || 3.5;
        input.num_inference_steps = steps || 20;

        console.log(`✅ Using FLUX-DEV + LoRA: ${dataset.model_version}`);
        console.log(`✅ Final prompt: ${finalPrompt}`);
      } else {
        console.warn(`⚠️ Custom model not ready, using base model`);
      }
    }

    // For base model only
    if (!isUsingCustomModel) {
      console.log(`🤖 Using base model: ${model}`);
      if (!input.negative_prompt) {
        input.negative_prompt = 'blurry, bad quality, distorted';
      }
    }

    console.log('🚀 Generation settings:', {
      model,
      usingLoRA: !!input.lora,
      steps: input.num_inference_steps,
      guidance: input.guidance_scale,
      seed: input.seed
    });

    // 🔧 ALTERNATIVE APPROACH: Use predictions API instead of run()
    console.log('🚀 Creating prediction...');
    
    const prediction = await replicate.predictions.create({
      model: model,
      input: input
    });

    console.log('📤 Prediction created:', prediction.id);

    // Wait for prediction to complete with timeout
    let finalPrediction = prediction;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max wait
    
    while ((finalPrediction.status === 'starting' || finalPrediction.status === 'processing') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      finalPrediction = await replicate.predictions.get(prediction.id);
      console.log(`⏳ Prediction status: ${finalPrediction.status} (${attempts + 1}/${maxAttempts})`);
      attempts++;
    }

    if (finalPrediction.status === 'failed') {
      console.error('❌ Prediction failed:', finalPrediction.error);
      throw new Error(`Prediction failed: ${finalPrediction.error}`);
    }

    if (finalPrediction.status !== 'succeeded') {
      console.error('❌ Prediction did not succeed:', finalPrediction.status);
      throw new Error(`Prediction ended with status: ${finalPrediction.status}`);
    }

    console.log('📤 Final prediction output:', finalPrediction.output);
    console.log('📤 Output type:', typeof finalPrediction.output);

    // Extract image URL from prediction output
    let imageUrl: string;
    
    if (Array.isArray(finalPrediction.output)) {
      imageUrl = finalPrediction.output[0];
      console.log('📸 Using first array item:', imageUrl);
    } else if (typeof finalPrediction.output === 'string') {
      imageUrl = finalPrediction.output;
      console.log('📸 Using direct string:', imageUrl);
    } else {
      console.error('❌ Unexpected prediction output format:', finalPrediction.output);
      throw new Error('Unexpected prediction output format');
    }

    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('❌ Invalid image URL from prediction:', imageUrl);
      throw new Error('No valid image URL returned from prediction');
    }

    if (!imageUrl.startsWith('http')) {
      console.error('❌ Image URL does not start with http:', imageUrl);
      throw new Error('Invalid image URL format');
    }

    console.log('✅ Image generated successfully:', imageUrl);

    // Save to database
    const { data: generation } = await supabaseAdmin
      .from('generations')
      .insert({
        user_id: userId,
        dataset_id: isUsingCustomModel ? datasetId : null,
        prompt: finalPrompt,
        image_url: imageUrl,
        settings: {
          steps: input.num_inference_steps,
          guidance: input.guidance_scale,
          seed: input.seed,
          width,
          height,
          model: model,
          lora: input.lora || null,
          usingCustomModel: isUsingCustomModel,
          predictionId: prediction.id
        },
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      imageUrl,
      generationId: generation?.id,
      prompt: finalPrompt,
      modelUsed: model,
      loraUsed: input.lora || null,
      usingCustomModel: isUsingCustomModel,
      predictionId: prediction.id,
      settings: {
        steps: input.num_inference_steps,
        guidance: input.guidance_scale,
        seed: input.seed,
        width,
        height
      }
    });

  } catch (error) {
    console.error('💥 Generation error:', error);
    
    return NextResponse.json({
      error: 'Failed to generate image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
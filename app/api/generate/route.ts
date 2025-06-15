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
    console.log('📋 Input params:', { prompt, datasetId: !!datasetId, userId: !!userId, steps, guidance });

    let model = 'black-forest-labs/flux-schnell';
    let finalPrompt = prompt;
    let isUsingCustomModel = false;

    // 🔧 Initialize input object - we'll modify this based on model type
    let input: any = {
      prompt: prompt,
      width: width,
      height: height,
      output_format: "webp"
    };

    // If user selected a custom model
    if (datasetId) {
      console.log(`🎯 Looking up custom model for dataset: ${datasetId}`);
      
      const { data: dataset } = await supabaseAdmin
        .from('datasets')
        .select('model_version, trigger_word, subject_name, training_status')
        .eq('id', datasetId)
        .eq('user_id', userId)
        .single();

      console.log('🔍 DEBUGGING CUSTOM MODEL:');
      console.log('- dataset found:', !!dataset);
      console.log('- training_status:', dataset?.training_status);
      console.log('- model_version:', dataset?.model_version);
      console.log('- trigger_word:', dataset?.trigger_word);
      console.log('- subject_name:', dataset?.subject_name);

      if (dataset && dataset.training_status === 'completed' && dataset.model_version) {
        console.log(`📋 ✅ Using custom model: ${dataset.model_version}`);

        // Use FLUX-DEV as base model for LoRA
        model = 'black-forest-labs/flux-dev';
        isUsingCustomModel = true;

        // 🔧 PRODUCTION: Optimal LoRA parameters for artists
        input.lora = dataset.model_version; // Use 'lora' parameter for FLUX-DEV
        input.lora_scale = 0.9; // Sweet spot - strong but not overpowering

        // Build prompt with trigger word (avoid duplication)
        if (dataset.trigger_word && prompt.trim()) {
          // Check if prompt already contains trigger word
          if (prompt.toLowerCase().includes(dataset.trigger_word.toLowerCase())) {
            finalPrompt = prompt; // Don't duplicate trigger word
          } else {
            finalPrompt = `${prompt}, ${dataset.trigger_word}`; // Put trigger at end
          }
        } else if (dataset.trigger_word) {
          finalPrompt = dataset.trigger_word;
        }

        // FLUX-DEV parameters optimized for LoRA
        input.prompt = finalPrompt;
        input.guidance_scale = guidance || 4.0; // Slightly higher for LoRA
        input.num_inference_steps = Math.min(steps || 25, 50); // Good quality/speed balance

        console.log(`✅ CUSTOM MODEL SETUP:`);
        console.log(`- Base model: ${model}`);
        console.log(`- LoRA: ${input.lora}`);
        console.log(`- LoRA scale: ${input.lora_scale}`);
        console.log(`- Original prompt: "${prompt}"`);
        console.log(`- Final prompt: "${finalPrompt}"`);
        console.log(`- Steps: ${input.num_inference_steps}`);
        console.log(`- Guidance: ${input.guidance_scale}`);
        
      } else {
        console.warn(`⚠️ Custom model not available:`, {
          found: !!dataset,
          status: dataset?.training_status,
          hasModelVersion: !!dataset?.model_version
        });
        isUsingCustomModel = false;
      }
    }

    // 🔧 FIX: Configure base model parameters correctly
    if (!isUsingCustomModel) {
      console.log('🤖 Using base model - setting correct parameters');
      
      if (model === 'black-forest-labs/flux-schnell') {
        // FLUX-schnell specific limits
        input.guidance_scale = 0; // FLUX-schnell doesn't use guidance
        input.num_inference_steps = Math.min(steps || 4, 4); // Max 4 steps for schnell
        delete input.negative_prompt; // Remove negative prompt for schnell
        
        console.log(`🔧 FLUX-schnell parameters: steps=${input.num_inference_steps}, guidance=${input.guidance_scale}`);
      } else {
        // Other base models
        input.guidance_scale = guidance || 7.5;
        input.num_inference_steps = steps || 20;
        input.negative_prompt = 'blurry, bad quality, distorted';
      }
    }

    // Add seed if provided
    if (seed !== undefined && seed !== null) {
      input.seed = seed;
    }

    console.log('🔍 FINAL GENERATION SETTINGS:');
    console.log('- isUsingCustomModel:', isUsingCustomModel);
    console.log('- model:', model);
    console.log('- lora:', input.lora || 'none');
    console.log('- lora_scale:', input.lora_scale || 'none');
    console.log('- final prompt:', finalPrompt);
    console.log('- steps:', input.num_inference_steps);
    console.log('- guidance:', input.guidance_scale);
    console.log('- seed:', input.seed || 'random');

    // Create prediction
    console.log('🚀 Creating prediction...');
    
    const prediction = await replicate.predictions.create({
      model: model,
      input: input
    });

    console.log('📤 Prediction created:', prediction.id);

    // Wait for prediction to complete
    let finalPrediction = prediction;
    let attempts = 0;
    const maxAttempts = 60;
    
    while ((finalPrediction.status === 'starting' || finalPrediction.status === 'processing') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
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

    // Extract image URL
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

    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
      console.error('❌ Invalid image URL:', imageUrl);
      throw new Error('Invalid image URL returned from prediction');
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
          lora_scale: input.lora_scale || null,
          usingCustomModel: isUsingCustomModel,
          predictionId: prediction.id,
          originalPrompt: prompt
        },
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      imageUrl,
      generationId: generation?.id,
      prompt: finalPrompt,
      originalPrompt: prompt,
      modelUsed: model,
      loraUsed: input.lora || null,
      loraScale: input.lora_scale || null,
      usingCustomModel: isUsingCustomModel,
      predictionId: prediction.id,
      debugInfo: {
        inputSteps: steps,
        inputGuidance: guidance,
        finalSteps: input.num_inference_steps,
        finalGuidance: input.guidance_scale,
        isCustomModel: isUsingCustomModel
      },
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
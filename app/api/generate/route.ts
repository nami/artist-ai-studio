import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { supabaseAdmin } from '@/lib/supabase-admin';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

// Convenient literal type for Replicate model slugs
type ModelSlug =
  | `${string}/${string}`          // owner/model             (latest)
  | `${string}/${string}:${string}`; // owner/model:version   (pinned)

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
      controlType, // 'pose', 'canny', 'depth'
      composition, // 'sitting', 'running', ...
      // New parameters for AI Image Generator
      steps,
      guidance,
      seed,
      width = 512,
      height = 512,
    } = body;

    /* ── 1. base model + input scaffold ───────────────────────── */
    let model: ModelSlug = 'black-forest-labs/flux-schnell';
    let finalPrompt = prompt;

    let input: Record<string, unknown> = {
      prompt: finalPrompt,
      negative_prompt: negativePrompt || 'blurry, bad quality, distorted',
      num_outputs: 1,
      guidance_scale: guidance || 0, // Use provided guidance or default
      num_inference_steps: steps || 4, // Use provided steps or default
      width,
      height,
    };

    // Add seed if provided
    if (seed !== undefined) {
      input.seed = seed;
    }

    /* ── 2. if user selected a trained model ──────────────────── */
    if (datasetId) {
      const { data: dataset } = await supabaseAdmin
        .from('datasets')
        .select('model_version, trigger_word, subject_name')
        .eq('id', datasetId)
        .eq('user_id', userId) // Security: ensure user owns this model
        .single();

      if (dataset?.model_version) {
        // For trained models, use FLUX-DEV with LoRA
        model = 'xlabs-ai/flux-dev-controlnet' as ModelSlug;
        
        // Apply LoRA model
        input.lora = dataset.model_version;
        input.lora_scale = 1.0;
        
        // Add trigger word if available
        if (dataset.trigger_word) {
          finalPrompt = `${dataset.trigger_word} ${prompt}`;
          input.prompt = finalPrompt;
        }
        
        // Update inference parameters for FLUX-DEV
        input.guidance_scale = guidance || 7.5; // Higher guidance for better prompt following
        input.num_inference_steps = steps || 20; // More steps for quality
      } else {
        return NextResponse.json(
          { error: 'Model not found or not ready' },
          { status: 404 }
        );
      }
    }

    /* ── 3. optional style tag ────────────────────────────────── */
    if (style) {
      finalPrompt = `${finalPrompt}, ${style}`;
      input.prompt = finalPrompt;
    }

    /* ── 4. ControlNet branch ─────────────────────────────────── */
    if (controlImage && controlType) {
      model = 'rossjillian/controlnet' as ModelSlug; // switch model
      input = {
        ...input,
        image: controlImage,
        structure: controlType,            // pose / canny / depth
        num_samples: 1,
        image_resolution: Math.min(width, height), // Use smaller dimension
        ddim_steps: steps || 20,
        scale: guidance || 9,
        eta: 0,
        a_prompt: 'best quality, extremely detailed',
        n_prompt:
          negativePrompt ||
          'longbody, lowres, bad anatomy, bad hands, missing fingers',
      };
    } else if (composition && datasetId) {
      const compositionPrompts: Record<string, string> = {
        sitting: 'sitting down, seated position',
        standing: 'standing up, full body standing',
        running: 'running, in motion, dynamic pose',
        jumping: 'jumping in the air, mid-jump',
        sleeping: 'sleeping, lying down, resting',
        playing: 'playing, playful pose',
      };

      const compExtra = compositionPrompts[composition];
      if (compExtra) {
        finalPrompt = `${finalPrompt}, ${compExtra}`;
        input.prompt = finalPrompt;
      }
    }

    console.log('Generating image with:', {
      model,
      prompt: finalPrompt.substring(0, 50) + '...',
      hasCustomModel: !!datasetId,
      parameters: { steps: input.num_inference_steps, guidance: input.guidance_scale, seed: input.seed }
    });

    /* ── 5. run Replicate model ───────────────────────────────── */
    const output = await replicate.run(model, { input });
    let imageUrl: string;
    
    // Handle different output formats
    if (Array.isArray(output)) {
      imageUrl = output[0];
    } else if (typeof output === 'string') {
      imageUrl = output;
    } else if (output && typeof output === 'object' && 'url' in output) {
      imageUrl = (output as any).url;
    } else {
      throw new Error('Unexpected output format from Replicate');
    }

    if (!imageUrl) {
      throw new Error('No image URL returned from generation');
    }

    /* ── 6. save generation row ───────────────────────────────── */
    const { data: generation } = await supabaseAdmin
      .from('generations')
      .insert({
        user_id: userId,
        dataset_id: datasetId,
        prompt: finalPrompt,
        negative_prompt: negativePrompt,
        image_url: imageUrl,
        settings: { 
          style, 
          controlType, 
          composition,
          steps: input.num_inference_steps,
          guidance: input.guidance_scale,
          seed: input.seed,
          width,
          height
        },
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      imageUrl,
      generationId: generation?.id,
      prompt: finalPrompt,
      modelId: datasetId,
      settings: {
        steps: input.num_inference_steps,
        guidance: input.guidance_scale,
        seed: input.seed,
        width,
        height
      }
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 },
    );
  }
}
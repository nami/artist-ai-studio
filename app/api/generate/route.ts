import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { supabaseAdmin } from '@/lib/supabase';

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
    } = body;

    /* ── 1. base model + input scaffold ───────────────────────── */
    let model: ModelSlug = 'black-forest-labs/flux-schnell';
    let finalPrompt = prompt;

    let input: Record<string, unknown> = {
      prompt: finalPrompt,
      negative_prompt: negativePrompt || 'blurry, bad quality, distorted',
      num_outputs: 1,
      guidance_scale: 0,
      num_inference_steps: 4,
    };

    /* ── 2. if user selected a trained model ──────────────────── */
    if (datasetId) {
      const { data: dataset } = await supabaseAdmin
        .from('datasets')
        .select('model_version, trigger_word')
        .eq('id', datasetId)
        .single();

      if (dataset?.model_version) {
        model = dataset.model_version as ModelSlug; // cast to satisfy TS
        finalPrompt = `${dataset.trigger_word} ${prompt}`;
        input.prompt = finalPrompt;
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
        image_resolution: 512,
        ddim_steps: 20,
        scale: 9,
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

    /* ── 5. run Replicate model ───────────────────────────────── */
    const output = await replicate.run(model, { input });
    const imageUrl = Array.isArray(output) ? output[0] : output;

    /* ── 6. save generation row ───────────────────────────────── */
    const { data: generation } = await supabaseAdmin
      .from('generations')
      .insert({
        user_id: userId,
        dataset_id: datasetId,
        prompt: finalPrompt,
        negative_prompt: negativePrompt,
        image_url: imageUrl,
        settings: { style, controlType, composition },
      })
      .select()
      .single();

    return NextResponse.json({
      imageUrl,
      generationId: generation?.id,
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 },
    );
  }
}

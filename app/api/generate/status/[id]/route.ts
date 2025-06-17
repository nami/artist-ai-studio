// app/api/generate/status/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const generationId = params.id;

    const { data: generation, error } = await supabaseAdmin
      .from('generations')
      .select('*')
      .eq('id', generationId)
      .single();

    if (error || !generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    // If still generating and we have prediction_id, check Replicate directly
    // This is important for localhost where webhooks don't work
    if (generation.status === 'generating' && generation.prediction_id) {
      try {
        const prediction = await replicate.predictions.get(generation.prediction_id);
        
        if (prediction.status === 'succeeded') {
          let imageUrl = '';
          if (Array.isArray(prediction.output)) {
            imageUrl = prediction.output[0];
          } else if (typeof prediction.output === 'string') {
            imageUrl = prediction.output;
          }

          if (imageUrl) {
            // Update database
            await supabaseAdmin
              .from('generations')
              .update({ 
                image_url: imageUrl,
                status: 'completed'
              })
              .eq('id', generationId);

            return NextResponse.json({
              id: generationId,
              status: 'completed',
              imageUrl,
              prompt: generation.prompt,
              createdAt: generation.created_at
            });
          }
        } else if (prediction.status === 'failed') {
          await supabaseAdmin
            .from('generations')
            .update({ 
              status: 'failed',
              error_message: prediction.error || 'Generation failed'
            })
            .eq('id', generationId);

          return NextResponse.json({
            id: generationId,
            status: 'failed',
            error: prediction.error || 'Generation failed',
            prompt: generation.prompt,
            createdAt: generation.created_at
          });
        }
        // Still processing - return current status
      } catch (replicateError) {
        console.error('Failed to check Replicate status:', replicateError);
        // Continue with database status if Replicate check fails
      }
    }

    return NextResponse.json({
      id: generation.id,
      status: generation.status || 'generating',
      imageUrl: generation.image_url,
      prompt: generation.prompt,
      error: generation.error_message,
      createdAt: generation.created_at
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}

export const maxDuration = 15;
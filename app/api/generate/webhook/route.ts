// app/api/generate/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('🎯 Webhook received:', data.id, data.status);

    if (data.status === 'succeeded') {
      let imageUrl = '';
      if (Array.isArray(data.output)) {
        imageUrl = data.output[0];
      } else if (typeof data.output === 'string') {
        imageUrl = data.output;
      }

      if (imageUrl) {
        await supabaseAdmin
          .from('generations')
          .update({ 
            image_url: imageUrl,
            status: 'completed'
          })
          .eq('prediction_id', data.id);

        console.log('✅ Generation completed via webhook:', data.id);
      }
    } else if (data.status === 'failed') {
      await supabaseAdmin
        .from('generations')
        .update({ 
          status: 'failed',
          error_message: data.error || 'Generation failed'
        })
        .eq('prediction_id', data.id);

      console.log('❌ Generation failed via webhook:', data.id);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}

export const maxDuration = 10;
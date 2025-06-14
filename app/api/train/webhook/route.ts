import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const WEBHOOK_SECRET = process.env.REPLICATE_WEBHOOK_SECRET || '';

async function verifySignature(signature: string, rawBody: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(rawBody)
  );
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return signature === expectedSignature;
}

export async function POST(req: NextRequest) {
  try {
    /* ── 1. Read raw body (needed if we verify) ───────────────── */
    const rawBody = await req.text();

    /* ── 2. Optional HMAC verification ────────────────────────── */
    if (WEBHOOK_SECRET) {
      const signature = req.headers.get('webhook-signature') ?? '';
      const isValid = await verifySignature(signature, rawBody, WEBHOOK_SECRET);

      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    /* ── 3. Parse JSON payload ────────────────────────────────── */
    const data = JSON.parse(rawBody);
    console.log('Webhook received:', { 
      status: data.status, 
      id: data.id,
      version: data.version 
    });

    // Map Replicate status to our database status
    let dbStatus: 'completed' | 'failed' | 'processing' = 'processing';
    if (data.status === 'succeeded') {
      dbStatus = 'completed';
    } else if (data.status === 'failed' || data.status === 'canceled') {
      dbStatus = 'failed';
    }

    /* ── 4. Build update payload for datasets row ─────────────── */
    const update: Record<string, unknown> = {
      training_status: dbStatus
    };

    // Handle success case
    if (dbStatus === 'completed') {
      update.model_version = data.version || data.output?.version;
      update.error_message = null; // Clear any previous errors
    }
    
    // Handle failure case
    if (dbStatus === 'failed') {
      update.error_message = data.error || 'Training failed';
    }

    /* ── 5. Write back via training_id ────────────────────────── */
    const { error } = await supabaseAdmin
      .from('datasets')
      .update(update)
      .eq('training_id', data.id);

    if (error) {
      console.error('Database update error:', error);
      throw error;
    }

    console.log('Successfully updated dataset for training:', data.id, 'Status:', dbStatus);
    return NextResponse.json({ received: true });

  } catch (err) {
    console.error('Replicate webhook error:', err);
    return NextResponse.json({ error: 'processing failed' }, { status: 500 });
  }
}

// Use nodejs runtime for better compatibility
export const runtime = 'nodejs';
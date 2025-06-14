// app/api/train/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    /* ── 3. Parse JSON payload ────────────────────────────────── */
    const data = JSON.parse(rawBody);
    // data.status : "succeeded" | "failed" | ...
    // data.version: "<owner>/<model>:sha"
    // data.error   (string) only on failure

    const status = data.status === 'succeeded' ? 'completed' : 'failed';

    /* ── 4. Build update payload for datasets row ─────────────── */
    const update: Record<string, unknown> = {
      training_status: status,
      model_version: data.version               // always store slug
    };
    if (status === 'failed') {
      update.error_message = data.error ?? 'Training failed';
    }

    /* ── 5. Write back via training_id ────────────────────────── */
    const { error } = await supabaseAdmin
      .from('datasets')
      .update(update)
      .eq('training_id', data.id);

    if (error) throw error;

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Replicate webhook error:', err);
    return NextResponse.json({ error: 'processing failed' }, { status: 500 });
  }
}

/* Edge runtime is perfect for tiny JSON webhooks */
export const runtime = 'edge';

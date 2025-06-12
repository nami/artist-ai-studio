import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { supabaseAdmin } from '@/lib/supabase';
import { nanoid } from 'nanoid';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrls, subjectName, subjectType, userId } = body;

    // ─── 1. basic validation ─────────────────────────────────────
    if (!imageUrls?.length || !subjectName || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ─── 2. create dataset row  ─────────────────────────────────
    const { data: dataset, error: dbError } = await supabaseAdmin
      .from('datasets')
      .insert({
        user_id: userId,
        name: `${subjectName} Model`,
        subject_name: subjectName,
        subject_type: subjectType,
        trigger_word: `ohwx ${subjectName.toLowerCase()}`,
        training_status: 'processing'
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // ─── 3. persist training images ─────────────────────────────
    const imageRecords = imageUrls.map((url: string) => ({
      dataset_id: dataset.id,
      image_url: url
    }));

    await supabaseAdmin.from('training_images').insert(imageRecords);

    // ─── 4. build input payload for the LoRA trainer ────────────
    const trainingData = {
      input_images: imageUrls.join(','),
      trigger_word: dataset.trigger_word,
      steps: 300,
      lora_rank: 16
    };

    // ─── 5. kick off Replicate training ─────────────────────────
    const training = await replicate.trainings.create(
      'ostris',
      'flux-dev-lora-trainer',
      '4a182a1313585278de25a8fdc9f60530d93f7ef7ebbbb1c0e3b2c864e3b6b7d4',
      {
        destination: `${process.env.REPLICATE_USERNAME}/flux-${nanoid(6)}`,
        input: trainingData,
        webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/train/webhook`,
        webhook_events_filter: ['completed']  // ← only “completed”
      }
    );

    // ─── 6. store training ids back into the dataset row ────────
    await supabaseAdmin
      .from('datasets')
      .update({
        training_id: training.id,
        model_version: training.version    // ← use .version
      })
      .eq('id', dataset.id);

    return NextResponse.json({
      datasetId: dataset.id,
      trainingId: training.id,
      status: 'processing'
    });
  } catch (error) {
    console.error('Training error:', error);
    return NextResponse.json(
      { error: 'Failed to start training' },
      { status: 500 }
    );
  }
}

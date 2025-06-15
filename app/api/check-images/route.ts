// Create: /app/api/check-images/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const datasetId = url.searchParams.get('datasetId')
    
    if (!datasetId) {
      return NextResponse.json({ error: 'Dataset ID required' }, { status: 400 })
    }

    // Get dataset info
    const { data: dataset } = await supabaseAdmin
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .single()

    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
    }

    // Get training images
    const { data: images } = await supabaseAdmin
      .from('training_images')
      .select('*')
      .eq('dataset_id', datasetId)
      .order('created_at', { ascending: true })

    return NextResponse.json({
      dataset: {
        id: dataset.id,
        name: dataset.subject_name,
        status: dataset.training_status,
        model_version: dataset.model_version,
        trigger_word: dataset.trigger_word
      },
      images: images || [],
      count: images?.length || 0,
      message: `Found ${images?.length || 0} training images`
    })

  } catch (error) {
    console.error('Error checking images:', error)
    return NextResponse.json({
      error: 'Failed to check images',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
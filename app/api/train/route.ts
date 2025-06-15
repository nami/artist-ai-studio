import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Set to 60 max for hobby plan
export const maxDuration = 60

// Helper function to safely get error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error'
}

export async function POST(request: NextRequest) {
  try {
    const { imageUrls, subjectName, subjectType, userId } = await request.json()
    
    // Validate inputs quickly
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length !== 10) {
      return NextResponse.json(
        { error: 'Exactly 10 image URLs required' },
        { status: 400 }
      )
    }

    if (!subjectName || !subjectType || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`🎯 Starting training for ${subjectName} with ${imageUrls.length} images`)

    // 1. Create database record first (quick operation)
    const { data: dataset, error: dbError } = await supabaseAdmin
      .from('datasets')
      .insert({
        user_id: userId,
        name: subjectName,
        subject_name: subjectName,
        subject_type: subjectType,
        trigger_word: 'TOK',
        image_count: imageUrls.length,
        training_status: 'preparing',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (dbError || !dataset) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to create training record' },
        { status: 500 }
      )
    }

    console.log(`✅ Created dataset record: ${dataset.id}`)

    // 2. Create ZIP (time-limited operation)
    console.log('📦 Creating ZIP file from images...')
    const zip = new JSZip()
    
    // Process images with timeout protection
    const imagePromises = imageUrls.slice(0, 10).map(async (imageUrl, index) => {
      try {
        console.log(`📥 Processing image ${index + 1}/10`)
        
        // Add timeout to individual fetch operations
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout per image
        
        const response = await fetch(imageUrl, { 
          signal: controller.signal,
          headers: {
            'User-Agent': 'AI-Training-Bot/1.0'
          }
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const imageBuffer = await response.arrayBuffer()
        const filename = `image_${String(index + 1).padStart(3, '0')}.jpg`
        zip.file(filename, imageBuffer)
        
        return { success: true, index }
      } catch (error) {
        console.warn(`⚠️ Failed to process image ${index + 1}:`, getErrorMessage(error))
        return { success: false, index, error: getErrorMessage(error) }
      }
    })

    // Wait for all images with overall timeout
    const results = await Promise.allSettled(imagePromises)
    const successfulImages = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    
    if (successfulImages < 8) {
      throw new Error(`Only ${successfulImages}/10 images processed successfully. Need at least 8.`)
    }

    console.log(`✅ Successfully processed ${successfulImages}/10 images`)

    // 3. Generate ZIP buffer (quick operation)
    console.log('🔄 Generating ZIP buffer...')
    const zipBuffer = await zip.generateAsync({ 
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })
    
    const zipSizeMB = zipBuffer.length / (1024 * 1024)
    console.log(`✅ ZIP created: ${zipBuffer.length} bytes (${zipSizeMB.toFixed(2)}MB)`)

    // 4. Upload ZIP to Replicate (quick operation)
    console.log('📤 Uploading ZIP to Replicate...')
    const formData = new FormData()
    formData.append('content', new Blob([zipBuffer]), 'training_images.zip')
    
    const uploadResponse = await fetch('https://api.replicate.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      },
      body: formData,
    })

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`)
    }

    const uploadData = await uploadResponse.json()
    const zipUrl = uploadData.download_url || uploadData.url
    console.log(`✅ ZIP uploaded: ${zipUrl}`)

    // 5. Start training (quick trigger - doesn't wait for completion)
    console.log('🚀 Starting training...')
    
    const trainResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'replicate/fast-flux-trainer:latest', // or use specific version
        input: {
          input_images: zipUrl,
          trigger_word: 'TOK',
          lora_type: subjectType,
          steps: 1000
        },
        webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/train/webhook`,
        webhook_events_filter: ["completed"]
      }),
    })

    if (!trainResponse.ok) {
      const errorText = await trainResponse.text()
      throw new Error(`Training start failed: ${trainResponse.status} - ${errorText}`)
    }

    const trainData = await trainResponse.json()
    console.log(`✅ Training started: ${trainData.id}`)

    // 6. Update database with training ID (quick operation)
    // 🔧 FIX: Don't save fake model names, let webhook save the real output
    await supabaseAdmin
      .from('datasets')
      .update({
        training_id: trainData.id, // This is the Replicate prediction ID
        model_version: null, // Will be set by webhook when training completes
        training_status: 'training',
        zip_url: zipUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', dataset.id)

    // 7. Return immediately (don't wait for training to complete)
    return NextResponse.json({
      success: true,
      trainingId: trainData.id, // Return the Replicate prediction ID
      datasetId: dataset.id,
      message: `Training started for "${subjectName}"`,
      estimatedTime: '20-40 minutes',
      zipSizeMB: zipSizeMB.toFixed(2)
    })

  } catch (error) {
    console.error('💥 Training start error:', getErrorMessage(error))
    
    return NextResponse.json({
      error: 'Failed to start training',
      details: getErrorMessage(error),
      suggestion: 'Check image URLs and try again'
    }, { status: 500 })
  }
}
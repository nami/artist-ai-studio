import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('🎣 Webhook received:', {
      id: body.id,
      status: body.status,
      hasOutput: !!body.output,
      hasError: !!body.error
    })

    const trainingId = body.id
    const status = body.status
    const output = body.output
    const error = body.error
    const logs = body.logs

    if (!trainingId) {
      console.error('❌ No training ID in webhook')
      return NextResponse.json({ error: 'No training ID' }, { status: 400 })
    }

    // Find the dataset by training_id
    const { data: dataset, error: findError } = await supabaseAdmin
      .from('datasets')
      .select('*')
      .eq('training_id', trainingId)
      .single()

    if (findError || !dataset) {
      console.error('❌ Dataset not found for training:', trainingId, findError)
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
    }

    console.log(`📊 Updating dataset ${dataset.id} (${dataset.subject_name}) with status: ${status}`)

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Handle different training statuses
    if (status === 'succeeded' || status === 'completed') {
      console.log('✅ Training completed successfully')
      
      if (output) {
        console.log('📋 Training output received:', typeof output, output)
        
        // 🔧 FIX: Save the actual model output from Replicate
        // This could be a LoRA model reference, file URL, or model version
        let modelVersion = output
        
        // Handle different output formats
        if (typeof output === 'object') {
          // If output is an object, try to extract the model reference
          if (output.model || output.model_version) {
            modelVersion = output.model || output.model_version
          } else if (output.url) {
            modelVersion = output.url
          } else {
            // Fallback: stringify the object
            modelVersion = JSON.stringify(output)
          }
        }
        
        updateData.model_version = modelVersion
        updateData.training_status = 'completed'
        updateData.completed_at = new Date().toISOString()
        
        console.log(`💾 Saving model version: ${modelVersion}`)
        
      } else {
        console.warn('⚠️ Training succeeded but no output received')
        updateData.training_status = 'failed'
        updateData.error_message = 'Training completed but no model output received'
      }
      
    } else if (status === 'failed' || status === 'canceled') {
      console.log(`❌ Training ${status}`)
      
      updateData.training_status = 'failed'
      updateData.error_message = error || `Training ${status}`
      
      if (logs) {
        console.log('📜 Training logs:', logs)
        updateData.logs = logs
      }
      
    } else if (status === 'processing' || status === 'starting') {
      console.log(`⏳ Training in progress: ${status}`)
      
      updateData.training_status = status
      
      if (logs) {
        updateData.logs = logs
      }
      
    } else {
      console.log(`📊 Unknown status: ${status}`)
      updateData.training_status = status
    }

    // Update the database
    const { error: updateError } = await supabaseAdmin
      .from('datasets')
      .update(updateData)
      .eq('id', dataset.id)

    if (updateError) {
      console.error('💥 Failed to update dataset:', updateError)
      throw updateError
    }

    console.log(`✅ Successfully updated dataset ${dataset.id} with status: ${updateData.training_status}`)

    // Log the final state for debugging
    if (updateData.model_version) {
      console.log(`🎯 Model ready: ${updateData.model_version}`)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully',
      datasetId: dataset.id,
      subjectName: dataset.subject_name,
      status: updateData.training_status,
      modelVersion: updateData.model_version || null
    })

  } catch (error) {
    console.error('💥 Webhook processing error:', error)
    
    return NextResponse.json({
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({
    message: 'Training webhook endpoint',
    status: 'active',
    timestamp: new Date().toISOString()
  })
}
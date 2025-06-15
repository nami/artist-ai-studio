// Create: /app/api/debug-training/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const trainingId = url.searchParams.get('trainingId') || 'n0nvjy2km1rm80cqem4t21zpbw'
    
    console.log('🔍 Checking training output for:', trainingId)

    // Check Replicate prediction
    const replicateResponse = await fetch(
      `https://api.replicate.com/v1/predictions/${trainingId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        },
      }
    )

    if (!replicateResponse.ok) {
      throw new Error(`Replicate API error: ${replicateResponse.status}`)
    }

    const replicateData = await replicateResponse.json()
    
    console.log('📋 Replicate prediction data:', {
      id: replicateData.id,
      status: replicateData.status,
      output: replicateData.output,
      logs: replicateData.logs ? 'Available' : 'None'
    })

    return NextResponse.json({
      trainingId,
      status: replicateData.status,
      output: replicateData.output,
      outputType: typeof replicateData.output,
      isArray: Array.isArray(replicateData.output),
      logs: replicateData.logs,
      created_at: replicateData.created_at,
      completed_at: replicateData.completed_at,
      analysis: {
        hasOutput: !!replicateData.output,
        outputLooksLikeLoRA: typeof replicateData.output === 'string' && replicateData.output.includes(':'),
        outputLooksLikeURL: typeof replicateData.output === 'string' && replicateData.output.startsWith('http'),
        recommendation: !replicateData.output 
          ? 'Training has no output - may have failed'
          : typeof replicateData.output === 'string' && replicateData.output.includes(':')
            ? 'Output looks like LoRA model reference'
            : 'Output format unclear - may need different handling'
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check training',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
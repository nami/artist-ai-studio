import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('datasets')
      .select('id, subject_name, subject_type, model_version, created_at, training_status')
      .eq('user_id', userId)
      .eq('training_status', 'completed')
      .not('model_version', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error fetching models:', error)
      throw error
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Failed to fetch models:', error)
    return NextResponse.json(
      { error: 'Failed to fetch models' }, 
      { status: 500 }
    )
  }
}
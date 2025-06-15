import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    console.log('🔍 Models API called with userId:', userId);

    if (!userId) {
      console.log('❌ No userId provided');
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // First, get ALL datasets for this user to see what we have
    console.log('📋 Fetching ALL datasets for user...');
    const { data: allDatasets, error: allError } = await supabaseAdmin
      .from('datasets')
      .select('id, subject_name, subject_type, model_version, created_at, training_status, training_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('❌ Database error fetching all datasets:', allError);
      throw allError;
    }

    console.log(`📊 Found ${allDatasets?.length || 0} total datasets for user`);
    allDatasets?.forEach((dataset, index) => {
      console.log(`  Dataset ${index + 1}:`, {
        id: dataset.id.substring(0, 8) + '...',
        name: dataset.subject_name,
        status: dataset.training_status,
        has_model_version: !!dataset.model_version,
        model_version: dataset.model_version ? dataset.model_version.substring(0, 20) + '...' : null,
        training_id: dataset.training_id
      });
    });

    // Now get only completed models
    console.log('🎯 Fetching completed models...');
    const { data: completedModels, error: completedError } = await supabaseAdmin
      .from('datasets')
      .select('id, subject_name, subject_type, model_version, created_at, training_status')
      .eq('user_id', userId)
      .eq('training_status', 'completed')
      .not('model_version', 'is', null)
      .order('created_at', { ascending: false });

    if (completedError) {
      console.error('❌ Database error fetching completed models:', completedError);
      throw completedError;
    }

    console.log(`✅ Found ${completedModels?.length || 0} completed models`);
    
    console.log('📤 Returning response:', {
      modelsCount: completedModels?.length || 0
    });

    return NextResponse.json(completedModels || []);
  } catch (error) {
    console.error('💥 Models API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch models',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
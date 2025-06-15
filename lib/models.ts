import { supabase } from '@/lib/supabase'

export interface TrainedModel {
  id: string
  subject_name: string
  subject_type: string
  model_version: string
  created_at: string
  training_status: 'completed' | 'processing' | 'failed'
}

export async function fetchUserModels(userId: string): Promise<TrainedModel[]> {
  try {
    const { data, error } = await supabase
      .from('datasets')
      .select('id, subject_name, subject_type, model_version, created_at, training_status')
      .eq('user_id', userId)
      .eq('training_status', 'completed')
      .not('model_version', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user models:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Failed to fetch user models:', error)
    throw error
  }
}

export async function getModelById(modelId: string, userId: string): Promise<TrainedModel | null> {
  try {
    const { data, error } = await supabase
      .from('datasets')
      .select('id, subject_name, subject_type, model_version, created_at, training_status')
      .eq('id', modelId)
      .eq('user_id', userId)
      .eq('training_status', 'completed')
      .single()

    if (error) {
      console.error('Error fetching model:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Failed to fetch model:', error)
    return null
  }
}
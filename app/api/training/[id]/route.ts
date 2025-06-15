import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('🔍 Fetching training data for:', id);

    // Fetch dataset by training_id
    const { data: datasetData, error: datasetError } = await supabaseAdmin
      .from('datasets')
      .select('*')
      .eq('training_id', id)
      .single();

    if (datasetError) {
      console.error('Dataset fetch error:', datasetError);
      return NextResponse.json(
        { error: 'Training not found' },
        { status: 404 }
      );
    }

    // Fetch training images
    const { data: imagesData, error: imagesError } = await supabaseAdmin
      .from('training_images')
      .select('*')
      .eq('dataset_id', datasetData.id);

    if (imagesError) {
      console.error('Images fetch error:', imagesError);
      return NextResponse.json(
        { error: 'Failed to load training images' },
        { status: 500 }
      );
    }

    // Convert to the format expected by TrainingDashboard
    const trainingImages = imagesData.map((img, index) => ({
      id: img.id,
      preview: img.image_url,
      name: `Image ${index + 1}`,
    }));

    const imageUrls = imagesData.map((img) => img.image_url);

    console.log('✅ Training data loaded:', {
      dataset: datasetData.subject_name,
      imageCount: imageUrls.length
    });

    return NextResponse.json({
      dataset: datasetData,
      trainingImages,
      imageUrls
    });

  } catch (err) {
    console.error('💥 Failed to fetch training data:', err);
    
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    
    return NextResponse.json(
      { error: 'Failed to fetch training data', details: errorMessage },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

// POST - Create a generation record (for edited images or manual saves)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      prompt,
      imageUrl,
      settings = {},
      isEditedImage = false,
    } = body;

    if (!userId || !prompt || !imageUrl) {
      return NextResponse.json(
        { error: "User ID, prompt, and image URL are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create generation record
    const { data: generation, error } = await supabaseAdmin
      .from("generations")
      .insert({
        user_id: userId,
        dataset_id: null, // No dataset for edited images
        prompt: prompt,
        image_url: imageUrl,
        prediction_id: null, // No prediction ID for edited images
        status: "completed",
        settings: {
          steps: settings.steps || 30,
          guidance: settings.guidance || 7.5,
          seed: settings.seed || Math.floor(Math.random() * 1000000),
          isEditedImage: isEditedImage,
        },
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to create generation record" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        generationId: generation.id,
        generation: generation,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Generation creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

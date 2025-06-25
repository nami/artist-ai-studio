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

// GET - Fetch gallery images for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: galleryImages, error } = await supabaseAdmin
      .from("gallery")
      .select(
        `
        id,
        created_at,
        title,
        tags,
        is_favorite,
        generations (
          id,
          prompt,
          image_url,
          settings,
          created_at
        )
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch gallery images" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { images: galleryImages || [] },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Gallery fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST - Save a generation to gallery
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { generationId, userId, title, tags = [], isFavorite = false } = body;

    if (!generationId || !userId) {
      return NextResponse.json(
        { error: "Generation ID and User ID are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if the generation exists and belongs to the user
    const { data: generation, error: genError } = await supabaseAdmin
      .from("generations")
      .select("id, user_id, prompt, image_url, status")
      .eq("id", generationId)
      .eq("user_id", userId)
      .single();

    if (genError || !generation) {
      return NextResponse.json(
        { error: "Generation not found or access denied" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (generation.status !== "completed" || !generation.image_url) {
      return NextResponse.json(
        { error: "Generation is not completed or has no image" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if already saved to gallery
    const { data: existingGalleryItem } = await supabaseAdmin
      .from("gallery")
      .select("id")
      .eq("generation_id", generationId)
      .eq("user_id", userId)
      .single();

    if (existingGalleryItem) {
      return NextResponse.json(
        { error: "Image already saved to gallery" },
        { status: 409, headers: corsHeaders }
      );
    }

    // Save to gallery
    const { data: galleryItem, error: galleryError } = await supabaseAdmin
      .from("gallery")
      .insert({
        user_id: userId,
        generation_id: generationId,
        title: title || generation.prompt,
        tags: tags,
        is_favorite: isFavorite,
      })
      .select()
      .single();

    if (galleryError) {
      console.error("Gallery save error:", galleryError);
      return NextResponse.json(
        { error: "Failed to save to gallery" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        galleryItem: {
          id: galleryItem.id,
          title: galleryItem.title,
          tags: galleryItem.tags,
          isFavorite: galleryItem.is_favorite,
          createdAt: galleryItem.created_at,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Gallery save error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

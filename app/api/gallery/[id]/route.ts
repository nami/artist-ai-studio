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

// DELETE - Remove an item from gallery
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const galleryId = params.id;

    if (!userId || !galleryId) {
      return NextResponse.json(
        { error: "User ID and Gallery ID are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Delete the gallery item (only if it belongs to the user)
    const { error } = await supabaseAdmin
      .from("gallery")
      .delete()
      .eq("id", galleryId)
      .eq("user_id", userId);

    if (error) {
      console.error("Gallery delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete gallery item" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error("Gallery delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

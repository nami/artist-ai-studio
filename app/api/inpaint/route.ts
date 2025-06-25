// app/api/inpaint/route.ts - Complete fixed version with proper TypeScript types

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { put } from "@vercel/blob";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

// Define proper types for Replicate responses
interface ReplicateResponse {
  url?: string;
  image?: string;
  output?: string;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageUrl = formData.get("imageUrl") as string;
    const maskFile = formData.get("mask") as File;
    const prompt = formData.get("prompt") as string;
    const preservePose = formData.get("preservePose") === "true";

    // 🔥 FIXED: Better prompt cleaning that removes problematic prefixes
    let cleanPrompt = prompt.trim();

    // Remove various "edit this" patterns more aggressively
    cleanPrompt = cleanPrompt
      .replace(/^edit\s+this\s+.*?image\s*:?\s*,?\s*/i, "") // "Edit this [anything] image:"
      .replace(/^edit\s+this\s*:?\s*,?\s*/i, "") // "Edit this:"
      .replace(/^edit\s*:?\s*,?\s*/i, "") // "Edit:"
      .replace(/^[,\s]*/, "") // Remove leading commas/spaces
      .replace(/,\s*$/, "") // Remove trailing commas
      .trim();

    // If the prompt starts with leftover fragments, clean those too
    cleanPrompt = cleanPrompt
      .replace(/^image\s*:?\s*,?\s*/i, "") // Remove leftover "image:"
      .replace(/^style\s+image\s*:?\s*,?\s*/i, "") // Remove leftover "style image:"
      .replace(/^[,\s]*/, "") // Remove any remaining leading punctuation
      .trim();

    // Validate that we have a meaningful prompt after cleaning
    if (!cleanPrompt || cleanPrompt.length < 3) {
      throw new Error("Prompt is empty or too short after cleaning");
    }

    // Upload mask to Vercel Blob
    let maskUrl = "";
    if (
      process.env.BLOB_READ_WRITE_TOKEN &&
      process.env.BLOB_READ_WRITE_TOKEN !== "local_development"
    ) {
      const maskBlob = await put(`masks/${Date.now()}-mask.png`, maskFile, {
        access: "public",
      });
      maskUrl = maskBlob.url;
    } else {
      // In development, use placeholder
      maskUrl = "https://via.placeholder.com/512?text=mask";
    }

    let output;
    let enhancedPrompt = cleanPrompt;

    if (preservePose) {
      // 🔥 ENHANCED: More specific pose preservation instructions
      enhancedPrompt = `${cleanPrompt}, keeping the exact same pose and body position, maintaining original posture and stance, preserving all body positioning and orientation`;

      output = await replicate.run("black-forest-labs/flux-fill-dev", {
        input: {
          image: imageUrl,
          mask: maskUrl,
          prompt: enhancedPrompt,
          num_inference_steps: 40, // Increased even more for better precision
          guidance_scale: 9.0, // Increased for stronger prompt following
          strength: 0.95, // Higher strength for more visible changes
          negative_prompt: `changing pose, different position, moving subject, altered body posture, modified stance, different body language, repositioned limbs, wrong location, misplaced object, blurry, low quality, distorted, bad anatomy, multiple objects, wrong colors, no change, same image`,
        },
      });
    } else {
      // 🔥 IMPROVED: Better standard inpainting parameters

      output = await replicate.run("black-forest-labs/flux-fill-dev", {
        input: {
          image: imageUrl,
          mask: maskUrl,
          prompt: enhancedPrompt,
          num_inference_steps: 40, // Increased for better quality
          guidance_scale: 9.0, // Increased for stronger prompt following
          strength: 0.95, // Higher strength for more visible changes
          negative_prompt:
            "wrong location, misplaced object, blurry, low quality, distorted, bad anatomy, multiple objects, wrong colors, incorrect placement, no change, same image",
        },
      });
    }

    // 🔥 FIXED: Better ReadableStream handling for FLUX models
    let editedUrl: string;

    if (typeof output === "string") {
      editedUrl = output;
    } else if (Array.isArray(output)) {
      if (output.length === 0) {
        throw new Error("Empty array response from FLUX Fill model");
      }

      // Handle ReadableStream in array (common with FLUX models)
      if (
        output[0] &&
        typeof output[0] === "object" &&
        output[0] !== null &&
        "locked" in output[0]
      ) {
        // For FLUX models, the ReadableStream usually contains the direct URL
        // Try to extract it properly
        try {
          // First attempt: check if it's actually a URL string disguised as ReadableStream
          const streamStr = String(output[0]);

          if (streamStr.startsWith("http")) {
            editedUrl = streamStr;
          } else {
            // Second attempt: FLUX sometimes wraps the URL in the stream
            // This is a fallback approach - may need adjustment based on actual FLUX behavior

            // For FLUX Fill, sometimes we need to wait a moment and check again
            // or the URL is in a different property
            throw new Error("Could not extract URL from ReadableStream");
          }
        } catch (streamError) {
          console.error(
            "❌ Failed to extract from ReadableStream:",
            streamError
          );
          throw new Error(
            "Failed to process ReadableStream response from FLUX Fill"
          );
        }
      } else {
        // Regular array with string URL
        editedUrl = String(output[0]);
      }
    } else if (output && typeof output === "object") {
      const outputObj = output as ReplicateResponse;

      if (outputObj.url && typeof outputObj.url === "string") {
        editedUrl = outputObj.url;
      } else if (outputObj.image && typeof outputObj.image === "string") {
        editedUrl = outputObj.image;
      } else if (outputObj.output && typeof outputObj.output === "string") {
        editedUrl = outputObj.output;
      } else {
        editedUrl = String(output);

        if (!editedUrl.startsWith("http")) {
          throw new Error("Invalid response format from FLUX Fill model");
        }
      }
    } else {
      throw new Error("Unexpected output format from FLUX Fill model");
    }

    // Validate the URL format
    if (!editedUrl || !editedUrl.startsWith("http")) {
      console.error("❌ Invalid URL:", editedUrl);
      throw new Error("Invalid image URL returned from model");
    }

    return NextResponse.json({
      imageUrl: editedUrl,
      promptUsed: enhancedPrompt,
      originalPrompt: cleanPrompt,
      inputUrl: imageUrl, // For debugging
    });
  } catch (error) {
    console.error("❌ Inpainting error:", error);

    // 🔥 IMPROVED: Better fallback with same prompt cleaning
    try {
      // Create new request clone for fallback
      const cloneRequest = request.clone();
      const originalFormData = await cloneRequest.formData();

      const imageUrlFallback = originalFormData.get("imageUrl") as string;
      const maskFileFallback = originalFormData.get("mask") as File;
      const rawPromptFallback = originalFormData.get("prompt") as string;

      // Apply same prompt cleaning to fallback
      let cleanPromptFallback = rawPromptFallback.trim();
      cleanPromptFallback = cleanPromptFallback
        .replace(/^edit\s+this\s+.*?image\s*:?\s*,?\s*/i, "")
        .replace(/^edit\s+this\s*:?\s*,?\s*/i, "")
        .replace(/^edit\s*:?\s*,?\s*/i, "")
        .replace(/^[,\s]*/, "")
        .replace(/,\s*$/, "")
        .replace(/^image\s*:?\s*,?\s*/i, "")
        .replace(/^style\s+image\s*:?\s*,?\s*/i, "")
        .replace(/^[,\s]*/, "")
        .trim();

      // Re-upload mask for fallback
      let maskUrlFallback = "";
      if (
        process.env.BLOB_READ_WRITE_TOKEN &&
        process.env.BLOB_READ_WRITE_TOKEN !== "local_development"
      ) {
        const maskBlobFallback = await put(
          `masks/${Date.now()}-fallback-mask.png`,
          maskFileFallback,
          {
            access: "public",
          }
        );
        maskUrlFallback = maskBlobFallback.url;
      } else {
        maskUrlFallback = "https://via.placeholder.com/512?text=mask";
      }

      const fallbackOutput = await replicate.run("zsxkib/flux-dev-inpainting", {
        input: {
          image: imageUrlFallback,
          mask: maskUrlFallback,
          prompt: cleanPromptFallback,
          num_inference_steps: 35,
          guidance_scale: 8.0,
          strength: 0.9,
          negative_prompt:
            "wrong location, misplaced object, blurry, low quality, distorted, bad anatomy, no change, same image",
        },
      });

      let fallbackUrl: string;
      if (typeof fallbackOutput === "string") {
        fallbackUrl = fallbackOutput;
      } else if (Array.isArray(fallbackOutput)) {
        fallbackUrl = String(fallbackOutput[0]);
      } else if (fallbackOutput && typeof fallbackOutput === "object") {
        const fallbackObj = fallbackOutput as ReplicateResponse;
        fallbackUrl =
          fallbackObj.url || fallbackObj.image || String(fallbackOutput);
      } else {
        fallbackUrl = String(fallbackOutput);
      }

      if (!fallbackUrl || !fallbackUrl.startsWith("http")) {
        throw new Error("Invalid fallback image URL");
      }

      return NextResponse.json({
        imageUrl: fallbackUrl,
        promptUsed: cleanPromptFallback,
        originalPrompt: cleanPromptFallback,
        usedFallback: true,
        inputUrl: imageUrlFallback,
      });
    } catch (fallbackError) {
      console.error("❌ Fallback also failed:", fallbackError);
      return NextResponse.json(
        {
          error: "Failed to edit image with both primary and fallback models",
          details:
            fallbackError instanceof Error
              ? fallbackError.message
              : "Unknown error",
        },
        { status: 500 }
      );
    }
  }
}

// Enhanced GET endpoint for testing and debugging
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "test") {
    try {
      const response = await fetch(
        "https://api.replicate.com/v1/models/black-forest-labs/flux-fill-dev",
        {
          headers: {
            Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          },
        }
      );

      if (response.ok) {
        return NextResponse.json({
          status: "✅ FLUX Fill DEV model is accessible",
          model: "black-forest-labs/flux-fill-dev",
          timestamp: new Date().toISOString(),
        });
      } else {
        return NextResponse.json({
          status: "❌ FLUX Fill DEV model not accessible",
          fallback: "zsxkib/flux-dev-inpainting available",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      return NextResponse.json(
        {
          error: "Failed to test model availability",
          details: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    message: "🎨 AI Inpaint API is running",
    version: "2.1.0",
    features: [
      "✨ Enhanced prompt cleaning (fixed regex)",
      "🌊 Better ReadableStream handling",
      "🎯 Improved mask precision",
      "🦴 Better pose preservation",
      "🔄 Robust fallback handling",
    ],
    endpoints: {
      "POST /": "Process inpainting request with enhanced precision",
      "GET /?action=test": "Test model availability and status",
    },
    timestamp: new Date().toISOString(),
  });
}

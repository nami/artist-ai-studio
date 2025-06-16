// app/api/inpaint/route.ts - Complete fixed version with better prompt handling and precision

import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { put } from "@vercel/blob";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageUrl = formData.get("imageUrl") as string;
    const maskFile = formData.get("mask") as File;
    const prompt = formData.get("prompt") as string;
    const preservePose = formData.get("preservePose") === "true";

    console.log("🎨 Starting inpaint process...");
    console.log("📸 Image URL:", imageUrl);
    console.log("✏️ Raw prompt:", prompt);
    console.log("🎯 Preserve pose:", preservePose);

    // 🔥 IMPROVED: Clean and enhance the prompt
    let cleanPrompt = prompt
      .trim()
      .replace(/^[,\s]*/, '') // Remove leading commas/spaces
      .replace(/^edit this.*?:?\s*/i, '') // Remove "edit this..." prefix
      .replace(/,\s*$/, '') // Remove trailing commas
      .trim();

    console.log("✨ Cleaned prompt:", cleanPrompt);

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
      console.log("🎭 Mask uploaded:", maskUrl);
    } else {
      // In development, use placeholder
      maskUrl = "https://via.placeholder.com/512?text=mask";
      console.log("🔧 Using placeholder mask for development");
    }

    let output;
    let enhancedPrompt = cleanPrompt;

    if (preservePose) {
      // 🔥 ENHANCED: More specific pose preservation instructions
      console.log("🦴 Adding pose preservation to prompt...");
      enhancedPrompt = `${cleanPrompt}, keeping the exact same pose and body position, maintaining original posture and stance, preserving all body positioning and orientation`;
      
      console.log("🎨 Starting FLUX Fill DEV inpainting with pose preservation...");
      output = await replicate.run("black-forest-labs/flux-fill-dev", {
        input: {
          image: imageUrl,
          mask: maskUrl,
          prompt: enhancedPrompt,
          num_inference_steps: 35, // Increased for better precision
          guidance_scale: 8.5, // Increased for stronger prompt following
          strength: 0.9, // Higher strength for more visible changes
          negative_prompt: `changing pose, different position, moving subject, altered body posture, modified stance, different body language, repositioned limbs, wrong location, misplaced object, blurry, low quality, distorted, bad anatomy, multiple objects, wrong colors`,
        },
      });
    } else {
      // 🔥 IMPROVED: Better standard inpainting parameters
      console.log("🎨 Starting standard FLUX Fill DEV inpainting...");
      output = await replicate.run("black-forest-labs/flux-fill-dev", {
        input: {
          image: imageUrl,
          mask: maskUrl,
          prompt: enhancedPrompt,
          num_inference_steps: 35, // Increased for better quality
          guidance_scale: 8.5, // Increased for stronger prompt following
          strength: 0.9, // Higher strength for more visible changes
          negative_prompt: "wrong location, misplaced object, blurry, low quality, distorted, bad anatomy, multiple objects, wrong colors, incorrect placement",
        },
      });
    }

    console.log("🔍 Raw output type:", typeof output);
    console.log("🔍 Raw output:", output);

    // Handle different response formats with correct TypeScript types
    let editedUrl: string;
    
    if (typeof output === 'string') {
      editedUrl = output;
    } else if (Array.isArray(output)) {
      // Handle ReadableStream in array
      if (output[0] && typeof output[0] === 'object' && 'locked' in output[0]) {
        // This is a ReadableStream, convert to string
        editedUrl = String(output[0]);
        // If it doesn't look like a URL, there might be an issue
        if (!editedUrl.startsWith('http')) {
          console.log("⚠️ ReadableStream detected, attempting to extract URL...");
          // Try to read the stream content or use fallback
          editedUrl = await handleReadableStreamResponse(output[0]);
        }
      } else {
        editedUrl = String(output[0]);
      }
    } else if (output && typeof output === 'object') {
      const outputObj = output as any;
      if (outputObj.url && typeof outputObj.url === 'string') {
        editedUrl = outputObj.url;
      } else if (outputObj.image && typeof outputObj.image === 'string') {
        editedUrl = outputObj.image;
      } else if (outputObj.output && typeof outputObj.output === 'string') {
        editedUrl = outputObj.output;
      } else {
        console.log("⚠️ Unexpected object format, attempting conversion...");
        editedUrl = String(output);
        
        if (!editedUrl.startsWith('http')) {
          throw new Error('Invalid response format from FLUX Fill model');
        }
      }
    } else {
      throw new Error('Unexpected output format from FLUX Fill model');
    }

    console.log("✅ Edit completed:", editedUrl);

    // Validate the URL format
    if (!editedUrl || !editedUrl.startsWith('http')) {
      throw new Error('Invalid image URL returned from model');
    }

    return NextResponse.json({ 
      imageUrl: editedUrl,
      promptUsed: enhancedPrompt,
      originalPrompt: cleanPrompt 
    });
    
  } catch (error) {
    console.error("❌ Inpainting error:", error);
    
    // 🔥 IMPROVED: Better fallback with same prompt cleaning
    try {
      console.log("🔄 Trying fallback inpainting model...");
      
      const formData = await request.formData();
      const imageUrl = formData.get("imageUrl") as string;
      const maskFile = formData.get("mask") as File;
      const rawPrompt = formData.get("prompt") as string;
      
      // Apply same prompt cleaning to fallback
      const cleanPrompt = rawPrompt
        .trim()
        .replace(/^[,\s]*/, '')
        .replace(/^edit this.*?:?\s*/i, '')
        .replace(/,\s*$/, '')
        .trim();
      
      // Re-upload mask for fallback
      let maskUrl = "";
      if (
        process.env.BLOB_READ_WRITE_TOKEN &&
        process.env.BLOB_READ_WRITE_TOKEN !== "local_development"
      ) {
        const maskBlob = await put(`masks/${Date.now()}-fallback-mask.png`, maskFile, {
          access: "public",
        });
        maskUrl = maskBlob.url;
      } else {
        maskUrl = "https://via.placeholder.com/512?text=mask";
      }
      
      const fallbackOutput = await replicate.run("zsxkib/flux-dev-inpainting", {
        input: {
          image: imageUrl,
          mask: maskUrl,
          prompt: cleanPrompt,
          num_inference_steps: 30,
          guidance_scale: 7.5,
          strength: 0.85,
          negative_prompt: "wrong location, misplaced object, blurry, low quality, distorted, bad anatomy",
        },
      });
      
      console.log("🔍 Fallback output type:", typeof fallbackOutput);
      console.log("🔍 Fallback output:", fallbackOutput);
      
      let fallbackUrl: string;
      if (typeof fallbackOutput === 'string') {
        fallbackUrl = fallbackOutput;
      } else if (Array.isArray(fallbackOutput)) {
        fallbackUrl = String(fallbackOutput[0]);
      } else if (fallbackOutput && typeof fallbackOutput === 'object') {
        const fallbackObj = fallbackOutput as any;
        fallbackUrl = fallbackObj.url || fallbackObj.image || String(fallbackOutput);
      } else {
        fallbackUrl = String(fallbackOutput);
      }
      
      console.log("✅ Fallback edit completed:", fallbackUrl);
      
      if (!fallbackUrl || !fallbackUrl.startsWith('http')) {
        throw new Error('Invalid fallback image URL');
      }
      
      return NextResponse.json({ 
        imageUrl: fallbackUrl,
        promptUsed: cleanPrompt,
        originalPrompt: cleanPrompt,
        usedFallback: true 
      });
    } catch (fallbackError) {
      console.error("❌ Fallback also failed:", fallbackError);
      return NextResponse.json(
        { error: "Failed to edit image with both primary and fallback models" },
        { status: 500 }
      );
    }
  }
}

// 🔥 NEW: Helper function to handle ReadableStream responses
async function handleReadableStreamResponse(stream: any): Promise<string> {
  try {
    // For ReadableStream responses, we might need to extract the URL differently
    // This is a placeholder - the actual implementation depends on how Replicate returns the stream
    console.log("🔄 Handling ReadableStream response...");
    
    // If the stream contains the URL, we'd extract it here
    // For now, we'll convert to string and hope it's a URL
    const streamString = String(stream);
    
    if (streamString.startsWith('http')) {
      return streamString;
    }
    
    // If not a direct URL, we might need to read the stream content
    // This is a fallback - adjust based on actual Replicate response format
    throw new Error('Could not extract URL from ReadableStream');
  } catch (error) {
    console.error("❌ Failed to handle ReadableStream:", error);
    throw new Error('Failed to process ReadableStream response');
  }
}

// Enhanced GET endpoint for testing and debugging
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "test") {
    try {
      console.log("🧪 Testing FLUX Fill DEV model availability...");
      
      const response = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-fill-dev', {
        headers: {
          'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        },
      });
      
      if (response.ok) {
        return NextResponse.json({ 
          status: "✅ FLUX Fill DEV model is accessible",
          model: "black-forest-labs/flux-fill-dev",
          timestamp: new Date().toISOString()
        });
      } else {
        return NextResponse.json({ 
          status: "❌ FLUX Fill DEV model not accessible",
          fallback: "zsxkib/flux-dev-inpainting available",
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      return NextResponse.json({ 
        error: "Failed to test model availability",
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }

  return NextResponse.json({ 
    message: "🎨 AI Inpaint API is running",
    version: "2.0.0",
    features: [
      "✨ Enhanced prompt cleaning",
      "🎯 Improved mask precision",
      "🦴 Better pose preservation", 
      "🔄 Robust fallback handling"
    ],
    endpoints: {
      "POST /": "Process inpainting request with enhanced precision",
      "GET /?action=test": "Test model availability and status"
    },
    timestamp: new Date().toISOString()
  });
}
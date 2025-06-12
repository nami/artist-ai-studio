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
    const preservePose = formData.get("preservePose") === "true"; // New option

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

    if (preservePose) {
      // First, extract pose from original image
      const poseOutput = await replicate.run(
        "jagilley/controlnet-pose:0304474b83ba96e7a3569fec09e48248ba3a0228b1cf9bdac7b628ab0c020e97",
        {
          input: {
            image: imageUrl,
          },
        }
      );

      const poseImageUrl = Array.isArray(poseOutput)
        ? poseOutput[0]
        : poseOutput;

      // Then use ControlNet inpainting with pose preservation
      output = await replicate.run(
        "alimama-creative/flux-controlnet-inpaint:a6c1f518ae87601576bebb0731fcd49f9c6a93b37e39e3a28c8d14283db41503",
        {
          input: {
            image: imageUrl,
            mask: maskUrl,
            prompt: prompt,
            control_image: poseImageUrl,
            control_mode: "inpaint",
            num_inference_steps: 28,
            guidance_scale: 3.5,
            negative_prompt:
              "changing pose, different position, moving subject",
          },
        }
      );
    } else {
      // Standard inpainting without pose control
      output = await replicate.run(
        "stability-ai/stable-diffusion-inpainting:95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3",
        {
          input: {
            image: imageUrl,
            mask: maskUrl,
            prompt: prompt,
            num_outputs: 1,
          },
        }
      );
    }

    const editedUrl = Array.isArray(output) ? output[0] : output;

    return NextResponse.json({ imageUrl: editedUrl });
  } catch (error) {
    console.error("Inpainting error:", error);
    return NextResponse.json(
      { error: "Failed to edit image" },
      { status: 500 }
    );
  }
}

// Additional endpoint for pose extraction (useful for advanced features)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("imageUrl");

  if (!imageUrl) {
    return NextResponse.json({ error: "Image URL required" }, { status: 400 });
  }

  try {
    const output = await replicate.run(
      "jagilley/controlnet-pose:0304474b83ba96e7a3569fec09e48248ba3a0228b1cf9bdac7b628ab0c020e97",
      {
        input: {
          image: imageUrl,
        },
      }
    );

    const poseUrl = Array.isArray(output) ? output[0] : output;
    return NextResponse.json({ poseUrl });
  } catch (error) {
    console.error("Pose extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract pose" },
      { status: 500 }
    );
  }
}
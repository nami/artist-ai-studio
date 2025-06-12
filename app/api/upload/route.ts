import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    const uploadPromises = files.map(async (file) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Generate unique filename
      const filename = `${nanoid()}_${file.name}`;
      
      // Upload to Vercel Blob
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: file.type,
      });
      
      return blob.url;
    });

    const urls = await Promise.all(uploadPromises);
    
    return NextResponse.json({ urls });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
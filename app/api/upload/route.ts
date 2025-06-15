import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  console.log('🚀 Upload API route hit!');
  
  try {
    console.log('📝 Reading form data...');
    const formData = await request.formData();
    
    console.log('📁 Extracting files...');
    const allEntries = Array.from(formData.entries());
    console.log('🔍 All FormData entries:', allEntries.map(([key, value]) => ({ 
      key, 
      valueType: typeof value, 
      isFile: value instanceof File,
      constructor: value.constructor.name 
    })));
    
    // Get all files - try different approaches
    const filesFromGetAll = formData.getAll('files');
    const filesFromEntries = allEntries
      .filter(([key]) => key === 'files')
      .map(([, value]) => value);
    
    console.log('📊 Files from getAll:', filesFromGetAll.length);
    console.log('📊 Files from entries:', filesFromEntries.length);
    
    // Use the approach that works
    const rawFiles = filesFromGetAll.length > 0 ? filesFromGetAll : filesFromEntries;
    
    // Filter to actual File objects
    const files = rawFiles.filter((item): item is File => {
      const isFile = item instanceof File;
      console.log(`🔍 Item check: ${item.constructor.name}, isFile: ${isFile}`);
      return isFile;
    });
    
    console.log(`✅ Valid File objects: ${files.length}`);
    
    if (files.length === 0) {
      console.log('❌ No valid files found');
      return NextResponse.json(
        { error: 'No valid files found in request' },
        { status: 400 }
      );
    }

    console.log('📋 File details:', files.map(f => ({ 
      name: f.name, 
      size: f.size, 
      type: f.type,
      hasArrayBuffer: typeof f.arrayBuffer === 'function'
    })));

    console.log('🔧 Checking Blob token...');
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.log('❌ Missing BLOB_READ_WRITE_TOKEN');
      return NextResponse.json(
        { error: 'Blob storage not configured' },
        { status: 500 }
      );
    }

    console.log('⬆️ Starting uploads to Vercel Blob...');

    const uploadPromises = files.map(async (file, index) => {
      console.log(`📤 Processing file ${index + 1}/${files.length}: ${file.name}`);
      
      let buffer: Buffer;
      
      try {
        // Try arrayBuffer first
        if (typeof file.arrayBuffer === 'function') {
          console.log('📖 Reading with arrayBuffer()...');
          const bytes = await file.arrayBuffer();
          buffer = Buffer.from(bytes);
        } else {
          // Fallback - this shouldn't happen with real File objects
          console.log('📖 Fallback: reading as stream...');
          const reader = new FileReader();
          const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(new Error('FileReader error'));
            reader.readAsArrayBuffer(file);
          });
          buffer = Buffer.from(arrayBuffer);
        }
        
        console.log(`📏 Buffer created: ${buffer.length} bytes`);
        
        // Generate unique filename
        const filename = `${nanoid()}_${file.name}`;
        
        console.log(`💾 Uploading to Blob: ${filename}`);
        
        // Upload to Vercel Blob
        const blob = await put(filename, buffer, {
          access: 'public',
          contentType: file.type,
        });
        
        console.log(`✅ Upload successful: ${blob.url}`);
        
        return blob.url;
      } catch (fileError) {
        console.error(`💥 Error processing file ${file.name}:`, fileError);
        const errorMessage = fileError instanceof Error ? fileError.message : 'Unknown error';
        throw new Error(`Failed to process file ${file.name}: ${errorMessage}`);
      }
    });

    const urls = await Promise.all(uploadPromises);
    
    console.log('🎉 All uploads complete!', urls);
    
    return NextResponse.json({ urls });
  } catch (error) {
    console.error('💥 Upload error:', error);
    
    // Handle unknown error type properly
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    
    console.error('🔍 Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: errorName
    });
    
    return NextResponse.json(
      { error: `Failed to upload files: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
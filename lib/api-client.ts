import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
});

export const uploadImages = async (files: File[]) => {
  console.log('🚀 Starting file upload...');
  console.log('📁 Files to upload:', files.map(f => ({ 
    name: f.name, 
    size: f.size, 
    type: f.type,
    isFile: f instanceof File,
    hasArrayBuffer: typeof f.arrayBuffer === 'function'
  })));
  
  const formData = new FormData();
  
  // Add each file individually with the same key name
  files.forEach((file, index) => {
    console.log(`📎 Adding file ${index + 1}: ${file.name}`);
    formData.append('files', file);
  });
  
  // Debug: Check what's in FormData
  console.log('📋 FormData entries:');
  for (let [key, value] of formData.entries()) {
    console.log(`  ${key}:`, value instanceof File ? `File(${value.name})` : value);
  }
  
  try {
    const { data } = await api.post('/api/upload', formData, {
      // let Axios add the correct header + boundary
      // Add timeout for large files
      timeout: 60000, // 60 seconds
    });
    
    console.log('✅ Upload successful:', data.urls);
    return data.urls as string[];
  } catch (error) {
    console.error('💥 Upload failed:', error);
    throw error;
  }
};

export const startTraining = async (params: {
  imageUrls: string[];
  subjectName: string;
  subjectType: string;
  userId: string;
}) => {
  const { data } = await api.post('/api/train', params);
  return data;
};

export const checkTrainingStatus = async (jobId: string) => {
  const { data } = await api.get(`/api/train/status/${jobId}`);
  return data;
};

// Updated generateImage function for AI Image Generator component
export const generateImage = async (params: {
  prompt: string;
  modelId?: string; // Maps to datasetId in your backend
  userId: string;
  steps?: number;
  guidance?: number;
  seed?: number;
  width?: number;
  height?: number;
}) => {
  // Map modelId to datasetId for your existing backend
  const requestData = {
    prompt: params.prompt,
    datasetId: params.modelId, // Your backend expects datasetId
    userId: params.userId,
    steps: params.steps,
    guidance: params.guidance,
    seed: params.seed,
    width: params.width,
    height: params.height,
  };

  const { data } = await api.post('/api/generate', requestData);
  return data;
};

// Keep your existing advanced generateImage function with a different name
export const generateAdvancedImage = async (params: {
  prompt: string;
  datasetId?: string;
  userId: string;
  style?: string;
  negativePrompt?: string;
  composition?: string;
  controlImage?: string;
  controlType?: 'pose' | 'canny' | 'depth';
}) => {
  const { data } = await api.post('/api/generate', params);
  return data;
};

export const inpaintImage = async (
  imageUrl: string,
  maskFile: File,
  prompt: string,
  preservePose: boolean = false
) => {
  const formData = new FormData();
  formData.append('imageUrl', imageUrl);
  formData.append('mask', maskFile);
  formData.append('prompt', prompt);
  formData.append('preservePose', preservePose.toString());
  
  const { data } = await api.post('/api/inpaint', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const extractPose = async (imageUrl: string) => {
  const { data } = await api.get('/api/inpaint', {
    params: { imageUrl }
  });
  return data;
};

// Add function to fetch user's trained models
export const fetchUserModels = async (userId: string) => {
  const { data } = await api.get('/api/models', {
    params: { userId }
  });
  return data;
};
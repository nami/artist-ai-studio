import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
});

export const uploadImages = async (files: File[]) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  
  const { data } = await api.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data.urls as string[];
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

export const generateImage = async (params: {
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
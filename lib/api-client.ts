import axios from "axios";

// Use relative URLs in production, full URL only for local development
const getBaseURL = () => {
  // In production, use relative URLs to avoid cross-origin issues
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost"
  ) {
    return ""; // Empty string means relative URLs
  }
  // Local development - use environment variable or localhost
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

const baseURL = getBaseURL();

const api = axios.create({
  baseURL,
});

export const uploadImages = async (files: File[]) => {
  const formData = new FormData();

  // Add each file individually with the same key name
  files.forEach((file) => {
    formData.append("files", file);
  });

  try {
    const { data } = await api.post("/api/upload", formData, {
      // let Axios add the correct header + boundary
      // Add timeout for large files
      timeout: 60000, // 60 seconds
    });

    return data.urls as string[];
  } catch (error) {
    throw error;
  }
};

export const startTraining = async (params: {
  imageUrls: string[];
  subjectName: string;
  subjectType: string;
  userId: string;
}) => {
  const { data } = await api.post("/api/train", params);
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

  const { data } = await api.post("/api/generate", requestData);
  return data;
};

// Keep your existing advanced generateImage function with a different name
export const generateAdvancedImage = async (params: {
  prompt: string;
  steps?: number;
  guidance?: number;
  seed?: number;
  userId: string;
  datasetId?: string;
}) => {
  const { data } = await api.post("/api/generate", params);
  return data;
};

// NEW: Add FLUX.1 Kontext image editing function
export const editImageWithAI = async (params: {
  prompt: string;
  imageInput: string; // Base64 encoded image or image URL
  userId: string;
  steps?: number;
  guidance?: number;
  seed?: number;
}) => {
  const requestData = {
    ...params,
    editMode: true, // Flag to use FLUX.1 Kontext
  };
  
  const { data } = await api.post("/api/generate", requestData);
  return data;
};

export const inpaintImage = async (
  imageUrl: string,
  maskFile: File,
  prompt: string,
  preservePose: boolean = false
) => {
  const formData = new FormData();
  formData.append("imageUrl", imageUrl);
  formData.append("mask", maskFile);
  formData.append("prompt", prompt);
  formData.append("preservePose", preservePose.toString());

  const { data } = await api.post("/api/inpaint", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export const extractPose = async (imageUrl: string) => {
  const { data } = await api.get("/api/inpaint", {
    params: { imageUrl },
  });
  return data;
};

// Add function to fetch user's trained models
export const fetchUserModels = async (userId: string) => {
  const { data } = await api.get("/api/models", {
    params: { userId },
  });
  return data;
};

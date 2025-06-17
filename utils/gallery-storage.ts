// Utility functions for storing and retrieving gallery images

import { v4 as uuidv4 } from 'uuid'

export interface GalleryImage {
  id: string
  imageUrl: string
  prompt: string
  style: string
  timestamp: Date
  settings: {
    steps: number
    guidance: number
    seed: number
  }
  isFavorite: boolean
  tags: string[]
  metadata: {
    width: number
    height: number
    fileSize: number
  }
}

export const saveGalleryImage = (image: GalleryImage): boolean => {
  try {
    const existingImages = getGalleryImages()
    const updatedImages = [image, ...existingImages]
    localStorage.setItem("galleryImages", JSON.stringify(updatedImages))
    return true
  } catch (error) {
    console.error("Error saving gallery image:", error)
    return false
  }
}

export const getGalleryImages = (): GalleryImage[] => {
  try {
    const storedImages = localStorage.getItem("galleryImages")
    if (storedImages) {
      const parsed = JSON.parse(storedImages)
      return parsed.map((img: any) => ({
        ...img,
        timestamp: new Date(img.timestamp),
      }))
    }
  } catch (error) {
    console.error("Error loading gallery images:", error)
  }
  return []
}

export const updateGalleryImage = (id: string, updates: Partial<GalleryImage>): boolean => {
  try {
    const images = getGalleryImages()
    const updatedImages = images.map((img) => (img.id === id ? { ...img, ...updates } : img))
    localStorage.setItem("galleryImages", JSON.stringify(updatedImages))
    return true
  } catch (error) {
    console.error("Error updating gallery image:", error)
    return false
  }
}

export const deleteGalleryImage = (id: string): boolean => {
  try {
    const images = getGalleryImages()
    const filteredImages = images.filter((img) => img.id !== id)
    localStorage.setItem("galleryImages", JSON.stringify(filteredImages))
    return true
  } catch (error) {
    console.error("Error deleting gallery image:", error)
    return false
  }
}

export const deleteMultipleGalleryImages = (ids: string[]): boolean => {
  try {
    const images = getGalleryImages()
    const filteredImages = images.filter((img) => !ids.includes(img.id))
    localStorage.setItem("galleryImages", JSON.stringify(filteredImages))
    return true
  } catch (error) {
    console.error("Error deleting multiple gallery images:", error)
    return false
  }
}

export const clearGalleryImages = (): void => {
  try {
    localStorage.removeItem("galleryImages")
  } catch (error) {
    console.error("Error clearing gallery images:", error)
  }
}

// Add this function to save images to gallery
export function saveToGallery(imageData: {
  prompt: string
  style: string
  imageUrl: string
  settings?: {
    steps: number
    guidance: number
    seed: number
  }
}): GalleryImage {
  const newImage: GalleryImage = {
    id: uuidv4(),
    prompt: imageData.prompt,
    style: imageData.style || 'none',
    imageUrl: imageData.imageUrl,
    timestamp: new Date(),
    tags: [], // Auto-generate tags from prompt if needed
    isFavorite: false,
    settings: imageData.settings || {
      steps: 30,
      guidance: 7.5,
      seed: Math.floor(Math.random() * 1000000)
    },
    metadata: {
      width: 0, // These will be updated when the image is loaded
      height: 0,
      fileSize: 0
    }
  }

  // Get existing images
  const existingImages = getGalleryImages()
  
  // Add new image to the beginning (newest first)
  const updatedImages = [newImage, ...existingImages]
  
  // Save to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('galleryImages', JSON.stringify(updatedImages))
  }

  return newImage
}

// Save to Gallery Hook for React components
export function useSaveToGallery() {
  const saveImageToGallery = (imageData: {
    prompt: string
    style: string
    imageUrl: string
    settings?: {
      steps: number
      guidance: number
      seed: number
    }
  }) => {
    try {
      const savedImage = saveToGallery(imageData)
      console.log('✅ Image saved to gallery:', savedImage.id)
      return { success: true, image: savedImage }
    } catch (error) {
      console.error('❌ Failed to save image to gallery:', error)
      return { success: false, error }
    }
  }

  return { saveImageToGallery }
}

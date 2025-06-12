// Utility functions for storing and retrieving gallery images

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

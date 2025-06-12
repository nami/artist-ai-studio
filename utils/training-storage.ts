// Utility functions for storing and retrieving training images

interface TrainingImage {
  id: string
  preview: string
  name?: string
}

export const saveTrainingImages = (images: TrainingImage[]): boolean => {
  try {
    localStorage.setItem("trainingImages", JSON.stringify(images))
    return true
  } catch (error) {
    console.error("Error saving training images:", error)
    return false
  }
}

export const getTrainingImages = (): TrainingImage[] => {
  try {
    const storedImages = localStorage.getItem("trainingImages")
    if (storedImages) {
      return JSON.parse(storedImages)
    }
  } catch (error) {
    console.error("Error loading training images:", error)
  }
  return []
}

export const clearTrainingImages = (): void => {
  try {
    localStorage.removeItem("trainingImages")
  } catch (error) {
    console.error("Error clearing training images:", error)
  }
}

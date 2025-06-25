// Database-based gallery storage utilities

export interface GalleryImage {
  id: string;
  imageUrl: string;
  prompt: string;
  title: string;
  timestamp: Date;
  settings: {
    steps: number;
    guidance: number;
    seed: number;
  };
  isFavorite: boolean;
  tags: string[];
  generationId: string;
}

// Save a generation to the gallery
export async function saveToGallery(params: {
  generationId: string;
  userId: string;
  title?: string;
  tags?: string[];
  isFavorite?: boolean;
}): Promise<{
  success: boolean;
  error?: string;
  galleryItem?: {
    id: string;
    title: string;
    tags: string[];
    isFavorite: boolean;
    createdAt: string;
  };
}> {
  try {
    const response = await fetch("/api/gallery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || "Failed to save to gallery",
      };
    }

    const data = await response.json();
    return { success: true, galleryItem: data.galleryItem };
  } catch (error) {
    console.error("Error saving to gallery:", error);
    return { success: false, error: "Network error" };
  }
}

// Get gallery images for a user
export async function getGalleryImages(
  userId: string
): Promise<GalleryImage[]> {
  try {
    const response = await fetch(
      `/api/gallery?userId=${encodeURIComponent(userId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch gallery images");
      return [];
    }

    const data = await response.json();

    // Transform the database response to match our GalleryImage interface
    return (data.images || []).map(
      (item: {
        id: string;
        created_at: string;
        title: string;
        tags: string[];
        is_favorite: boolean;
        generations?: {
          id: string;
          prompt: string;
          image_url: string;
          settings: Record<string, unknown>;
        };
      }) => ({
        id: item.id,
        imageUrl: item.generations?.image_url || "",
        prompt: item.generations?.prompt || "",
        title: item.title || item.generations?.prompt || "",
        timestamp: new Date(item.created_at),
        settings: item.generations?.settings || {
          steps: 30,
          guidance: 7.5,
          seed: 0,
        },
        isFavorite: item.is_favorite || false,
        tags: item.tags || [],
        generationId: item.generations?.id || "",
      })
    );
  } catch (error) {
    console.error("Error fetching gallery images:", error);
    return [];
  }
}

// Delete a gallery image
export async function deleteGalleryImage(
  galleryId: string,
  userId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/gallery/${galleryId}?userId=${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to delete gallery image");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting gallery image:", error);
    return false;
  }
}

// Hook for saving to gallery
export function useSaveToGallery() {
  const saveImageToGallery = async (params: {
    generationId: string;
    userId: string;
    title?: string;
    tags?: string[];
    isFavorite?: boolean;
  }) => {
    try {
      const result = await saveToGallery(params);
      if (result.success) {
        console.log("✅ Image saved to gallery:", result.galleryItem?.id);
        return { success: true, galleryItem: result.galleryItem };
      } else {
        console.error("❌ Failed to save image to gallery:", result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("❌ Failed to save image to gallery:", error);
      return { success: false, error: "Network error" };
    }
  };

  return { saveImageToGallery };
}

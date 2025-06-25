"use client";

import { useState, useEffect } from "react";
import {
  Download,
  Trash2,
  ArrowLeft,
  Grid,
  List,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type GalleryImage,
  getGalleryImages,
  deleteGalleryImage,
} from "@/utils/gallery-storage";
import { useAuth } from "@/hooks/use-auth";

interface ImageGalleryProps {
  onBack: () => void;
  playSound?: (sound: string) => void;
}

export function ImageGallery({ onBack, playSound }: ImageGalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const { user, loading: authLoading } = useAuth();

  // Add escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightboxImage) {
        setLightboxImage(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [lightboxImage]);

  // Load images on mount with debugging
  useEffect(() => {
    const loadImages = async () => {
      if (!user?.id || authLoading) {
        setIsLoading(false);
        setDebugInfo("No user authenticated or still loading auth");
        return;
      }

      try {
        console.log("🔍 Loading gallery images from database...");
        setIsLoading(true);

        const galleryImages = await getGalleryImages(user.id);
        console.log("🖼️ Loaded gallery images:", galleryImages);

        // Sort by newest first
        galleryImages.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );
        setImages(galleryImages);

        // Set debug info
        setDebugInfo(
          `Found ${galleryImages.length} images in gallery database for user ${user.id}.`
        );

        setIsLoading(false);
      } catch (error) {
        console.error("❌ Error loading gallery images:", error);
        setDebugInfo(
          `Error loading images: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        setIsLoading(false);
      }
    };
    loadImages();
  }, [user?.id, authLoading]);

  // Function to refresh the gallery
  const refreshGallery = async () => {
    if (!user?.id) {
      setDebugInfo("Cannot refresh: no user authenticated");
      return;
    }

    setIsLoading(true);
    setTimeout(async () => {
      try {
        const galleryImages = await getGalleryImages(user.id);
        galleryImages.sort(
          (a: GalleryImage, b: GalleryImage) =>
            b.timestamp.getTime() - a.timestamp.getTime()
        );
        setImages(galleryImages);
        setDebugInfo(`Refreshed: Found ${galleryImages.length} images`);
        setIsLoading(false);
      } catch (error) {
        console.error("❌ Error refreshing gallery:", error);
        setDebugInfo(
          `Error refreshing: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        setIsLoading(false);
      }
    }, 500);
  };

  const deleteImage = async (id: string) => {
    if (!user?.id) {
      console.error("Cannot delete: no user authenticated");
      return;
    }

    const success = await deleteGalleryImage(id, user.id);
    if (success) {
      setImages((prev) => prev.filter((img) => img.id !== id));
      playSound?.("delete");
    } else {
      console.error("Failed to delete image from gallery");
    }
  };

  const downloadImage = (image: GalleryImage) => {
    const link = document.createElement("a");
    link.href = image.imageUrl;
    link.download = `ai-art-${image.id}.png`;
    link.click();
    playSound?.("click");
  };

  const openLightbox = (image: GalleryImage) => {
    const index = images.findIndex((img) => img.id === image.id);
    setLightboxImage(image);
    setLightboxIndex(index);
    playSound?.("click");
  };

  const navigateLightbox = (direction: "prev" | "next") => {
    const newIndex =
      direction === "prev"
        ? (lightboxIndex - 1 + images.length) % images.length
        : (lightboxIndex + 1) % images.length;

    setLightboxIndex(newIndex);
    setLightboxImage(images[newIndex]);
    playSound?.("hover");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-t-transparent border-purple-400 rounded-full animate-spin mx-auto"></div>
          <div className="text-purple-400 font-mono text-xl uppercase tracking-wide">
            LOADING GALLERY
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black p-2 sm:p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20" />
        <div className="absolute inset-0 opacity-10">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, #00ff00 2px, #00ff00 4px)",
            }}
          />
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-gray-900 rounded-lg border-4 border-gray-700 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b-2 border-gray-700">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 p-1 rounded-lg animate-pulse">
              <div className="bg-black px-4 py-2 rounded-md">
                <h1 className="text-xl md:text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 uppercase tracking-wider">
                  🖼️ AI ART GALLERY 🖼️
                </h1>
              </div>
            </div>
            <Badge
              variant="outline"
              className="font-mono text-xs text-cyan-400 border-cyan-400/50"
            >
              {images.length} IMAGES
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <Button
              onClick={refreshGallery}
              disabled={isLoading}
              className="bg-cyan-900/80 border-2 border-cyan-400/50 text-cyan-300 hover:bg-cyan-800/80 font-mono uppercase tracking-wide backdrop-blur-sm flex items-center gap-2 hover:scale-105 transition-transform"
              size="sm"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              REFRESH
            </Button>

            {/* View Mode Toggle */}
            <div className="flex border-2 border-purple-500/50 rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`rounded-none font-mono text-xs ${
                  viewMode === "grid"
                    ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                    : "text-gray-400 hover:text-purple-300 hover:bg-purple-500/10"
                }`}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={`rounded-none font-mono text-xs ${
                  viewMode === "list"
                    ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                    : "text-gray-400 hover:text-purple-300 hover:bg-purple-500/10"
                }`}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            <Button
              onClick={onBack}
              className="bg-blue-900/80 border-2 border-blue-400/50 text-blue-300 hover:bg-blue-800/80 font-mono uppercase tracking-wide backdrop-blur-sm flex items-center gap-2 hover:scale-105 transition-transform"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK
            </Button>
          </div>
        </div>

        {/* Debug Info */}
        {debugInfo && (
          <div className="relative z-10 p-4 border-b-2 border-gray-700 bg-gray-800/50">
            <div className="text-xs font-mono text-cyan-400 space-y-2">
              <div>🐛 Debug: {debugInfo}</div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    console.log("Gallery debug info:", {
                      userId: user?.id,
                      imageCount: images.length,
                      authLoading,
                    });
                    alert("Check console for gallery debug data");
                  }}
                  className="px-2 py-1 bg-yellow-800/50 border border-yellow-600 rounded text-yellow-300 hover:bg-yellow-700/50"
                >
                  Console Log
                </button>
                <button
                  onClick={() => refreshGallery()}
                  className="px-2 py-1 bg-blue-800/50 border border-blue-600 rounded text-blue-300 hover:bg-blue-700/50"
                >
                  Refresh Gallery
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gallery Content */}
        <div className="relative z-10 p-4">
          {images.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-2xl font-bold font-mono text-purple-400 mb-2 uppercase">
                NO IMAGES YET
              </h3>
              <p className="text-gray-400 font-mono">
                Generate some AI art to build your gallery!
              </p>
              <div className="mt-4 text-xs font-mono text-cyan-400">
                💡 Create images in the generator, then save them here to edit
                later
              </div>
              <div className="mt-4">
                <Button
                  onClick={refreshGallery}
                  className="bg-purple-900/80 border-2 border-purple-400/50 text-purple-300 hover:bg-purple-800/80 font-mono uppercase tracking-wide"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  CHECK AGAIN
                </Button>
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-4 space-y-4">
              {images.map((image) => (
                <GalleryGridItem
                  key={image.id}
                  image={image}
                  onDelete={deleteImage}
                  onDownload={downloadImage}
                  onOpenLightbox={openLightbox}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {images.map((image) => (
                <GalleryListItem
                  key={image.id}
                  image={image}
                  onDelete={deleteImage}
                  onDownload={downloadImage}
                  onOpenLightbox={openLightbox}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 pt-16"
          onClick={(e) => {
            // Close when clicking the backdrop
            if (e.target === e.currentTarget) {
              setLightboxImage(null);
            }
          }}
        >
          <div className="relative max-w-7xl max-h-[calc(100vh-4rem)] w-full">
            {/* Close Button */}
            <Button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 z-[60] bg-black/50 border-2 border-gray-600 text-white hover:border-red-400"
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>

            {/* Navigation */}
            {images.length > 1 && (
              <>
                <Button
                  onClick={() => navigateLightbox("prev")}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 border-2 border-gray-600 text-white hover:border-cyan-400"
                  size="sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => navigateLightbox("next")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 border-2 border-gray-600 text-white hover:border-cyan-400"
                  size="sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* Image */}
            <img
              src={lightboxImage.imageUrl}
              alt={lightboxImage.prompt}
              className="max-w-full max-h-[calc(100vh-8rem)] object-contain mx-auto rounded-lg"
              onError={(e) => {
                console.error(
                  "❌ Image failed to load:",
                  lightboxImage.imageUrl
                );
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                // Show error placeholder
                const errorDiv = document.createElement("div");
                errorDiv.className =
                  "flex items-center justify-center bg-gray-800 rounded-lg p-8 text-red-400 font-mono";
                errorDiv.innerHTML =
                  "❌ IMAGE FAILED TO LOAD<br/><small>URL may be expired or invalid</small>";
                target.parentNode?.appendChild(errorDiv);
              }}
            />

            {/* Image Info */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm border-2 border-gray-600 rounded-lg p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="text-white font-mono text-sm mb-2">
                    {lightboxImage.prompt}
                  </p>
                  <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                    <Badge
                      variant="outline"
                      className="text-purple-400 border-purple-400/50"
                    >
                      {lightboxImage.tags[0] || "gallery"}
                    </Badge>
                    <span className="text-gray-300">
                      {lightboxImage.timestamp.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-gray-500 mt-1 truncate">
                    URL: {lightboxImage.imageUrl}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => downloadImage(lightboxImage)}
                    variant="ghost"
                    size="sm"
                    className="text-green-400 hover:text-green-300 hover:bg-green-500/20"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      deleteImage(lightboxImage.id);
                      setLightboxImage(null);
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Gallery Grid Item Component
function GalleryGridItem({
  image,
  onDelete,
  onDownload,
  onOpenLightbox,
}: {
  image: GalleryImage;
  onDelete: (id: string) => void;
  onDownload: (image: GalleryImage) => void;
  onOpenLightbox: (image: GalleryImage) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className="relative break-inside-avoid mb-4 group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpenLightbox(image)}
    >
      <div className="relative overflow-hidden rounded-lg border-2 border-gray-600 hover:border-purple-400 transition-all duration-300 bg-gray-800">
        {imageError ? (
          <div className="w-full h-48 flex items-center justify-center bg-gray-800 text-red-400 font-mono text-sm">
            <div className="text-center">
              <div className="text-2xl mb-2">❌</div>
              <div>IMAGE FAILED TO LOAD</div>
              <div className="text-xs mt-1 text-gray-500 truncate px-2">
                {image.imageUrl}
              </div>
            </div>
          </div>
        ) : (
          <img
            src={image.imageUrl}
            alt={image.prompt}
            className="w-full h-auto object-cover transition-transform duration-300 hover:scale-105"
            onError={() => {
              console.error("❌ Image failed to load:", image.imageUrl);
              setImageError(true);
            }}
          />
        )}

        {/* Overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-300">
            <div className="flex items-center gap-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(image);
                }}
                variant="ghost"
                size="sm"
                className="text-green-400 hover:scale-110 hover:bg-green-500/20"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(image.id);
                }}
                variant="ghost"
                size="sm"
                className="text-red-400 hover:scale-110 hover:bg-red-500/20"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Info Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <p className="text-white text-xs font-mono truncate mb-1">
            {image.prompt}
          </p>
          <div className="flex justify-between items-center">
            <Badge
              variant="outline"
              className="text-xs font-mono text-purple-400 border-purple-400/50"
            >
              {image.tags[0] || "gallery"}
            </Badge>
            <span className="text-xs font-mono text-gray-300">
              {image.timestamp.toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Gallery List Item Component
function GalleryListItem({
  image,
  onDelete,
  onDownload,
  onOpenLightbox,
}: {
  image: GalleryImage;
  onDelete: (id: string) => void;
  onDownload: (image: GalleryImage) => void;
  onOpenLightbox: (image: GalleryImage) => void;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="bg-gray-800 border-2 border-gray-600 hover:border-purple-400 rounded-lg p-4 transition-all duration-300">
      <div className="flex gap-4">
        <div
          className="flex-shrink-0 cursor-pointer"
          onClick={() => onOpenLightbox(image)}
        >
          {imageError ? (
            <div className="w-24 h-24 flex items-center justify-center bg-gray-700 rounded-lg text-red-400 font-mono text-xs">
              <div className="text-center">
                <div>❌</div>
                <div>ERROR</div>
              </div>
            </div>
          ) : (
            <img
              src={image.imageUrl}
              alt={image.prompt}
              className="w-24 h-24 object-cover rounded-lg hover:scale-105 transition-transform"
              onError={() => {
                console.error("❌ Image failed to load:", image.imageUrl);
                setImageError(true);
              }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-mono text-sm mb-2 line-clamp-2">
            {image.prompt}
          </h3>
          <div className="flex items-center gap-2 mb-3">
            <Badge
              variant="outline"
              className="text-xs font-mono text-purple-400 border-purple-400/50"
            >
              {image.tags[0] || "gallery"}
            </Badge>
            <span className="text-xs font-mono text-gray-400">
              {image.timestamp.toLocaleDateString()}
            </span>
          </div>

          <div className="text-xs font-mono text-gray-500 mb-2 truncate">
            URL: {image.imageUrl}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => onDownload(image)}
              variant="ghost"
              size="sm"
              className="text-green-400 hover:text-green-300 font-mono text-xs hover:bg-green-500/20"
            >
              <Download className="w-3 h-3 mr-1" />
              DOWNLOAD
            </Button>
            <Button
              onClick={() => onDelete(image.id)}
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 font-mono text-xs hover:bg-red-500/20"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              DELETE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

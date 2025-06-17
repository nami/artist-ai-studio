"use client"

import { useState, useEffect } from "react"
import { 
  Heart, 
  Download, 
  Trash2, 
  Edit3, 
  ArrowLeft,
  Grid,
  List,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  type GalleryImage,
  getGalleryImages,
  updateGalleryImage,
  deleteGalleryImage,
} from "@/utils/gallery-storage"

interface ImageGalleryProps {
  onBack: () => void
  onEditImage?: (imageData: any) => void
  playSound?: (sound: string) => void
}

// Simple toast function for user feedback
const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
  console.log(`${type.toUpperCase()}: ${message}`)
  if (typeof window !== "undefined") {
    if (type === "error") {
      alert(`Error: ${message}`)
    } else if (type === "success") {
      console.log(`✅ ${message}`)
    }
  }
}

export function ImageGallery({ onBack, onEditImage, playSound }: ImageGalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Load images on mount
  useEffect(() => {
    const loadImages = () => {
      const galleryImages = getGalleryImages()
      console.log("🖼️ Loaded gallery images:", galleryImages.length)
      
      // Debug: Check image URLs
      galleryImages.forEach((img, index) => {
        console.log(`📸 Image ${index + 1}:`, {
          id: img.id,
          hasUrl: !!img.imageUrl,
          urlType: typeof img.imageUrl,
          urlLength: img.imageUrl?.length || 0,
          urlStart: img.imageUrl?.substring(0, 50) || "no URL",
          prompt: img.prompt?.substring(0, 30) || "no prompt"
        })
      })
      
      // Sort by newest first
      galleryImages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      setImages(galleryImages)
      setIsLoading(false)
    }
    loadImages()
  }, [])

  const toggleFavorite = (id: string) => {
    const image = images.find((img) => img.id === id)
    if (image) {
      const updated = { ...image, isFavorite: !image.isFavorite }
      updateGalleryImage(id, updated)
      setImages((prev) => prev.map((img) => (img.id === id ? updated : img)))
      playSound?.(updated.isFavorite ? "complete" : "click")
    }
  }

  const deleteImage = (id: string) => {
    deleteGalleryImage(id)
    setImages((prev) => prev.filter((img) => img.id !== id))
    playSound?.("delete")
  }

  const downloadImage = (image: GalleryImage) => {
    const link = document.createElement("a")
    link.href = image.imageUrl
    link.download = `ai-art-${image.id}.png`
    link.click()
    playSound?.("click")
  }

  const shareImage = async (image: GalleryImage) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "AI Generated Art",
          text: image.prompt,
          url: image.imageUrl,
        })
      } catch (error) {
        console.log("Error sharing:", error)
      }
    } else {
      navigator.clipboard.writeText(image.imageUrl)
      playSound?.("click")
    }
  }

  const openLightbox = (image: GalleryImage) => {
    const index = images.findIndex((img) => img.id === image.id)
    setLightboxImage(image)
    setLightboxIndex(index)
    playSound?.("click")
  }

  const navigateLightbox = (direction: "prev" | "next") => {
    const newIndex =
      direction === "prev"
        ? (lightboxIndex - 1 + images.length) % images.length
        : (lightboxIndex + 1) % images.length

    setLightboxIndex(newIndex)
    setLightboxImage(images[newIndex])
    playSound?.("hover")
  }

  const editInImageEditor = (image: GalleryImage) => {
    console.log("🎨 Edit button clicked for image:", image.id)
    console.log("📸 Image URL:", image.imageUrl)
    console.log("📝 Original prompt:", image.prompt)
    
    if (!image.imageUrl) {
      console.error("❌ No image URL found for editing")
      showToast("Cannot edit image: No image URL found. Try regenerating the image.", "error")
      return
    }
    
    // Check if URL is accessible (basic validation)
    if (!image.imageUrl.startsWith('http') && !image.imageUrl.startsWith('data:')) {
      console.error("❌ Invalid image URL format:", image.imageUrl)
      showToast("Cannot edit image: Invalid image URL format", "error")
      return
    }
    
    if (!onEditImage) {
      console.error("❌ No onEditImage callback provided")
      showToast("Cannot edit image: Editor not available. Make sure you're accessing from the main app.", "error")
      return
    }

    // Prepare image data for the editor with all required fields
    const imageData = {
      id: image.id,
      prompt: image.prompt || "Edited image",
      style: image.style || "none", 
      imageUrl: image.imageUrl,
      timestamp: image.timestamp || new Date(),
      settings: image.settings || { 
        steps: 30, 
        guidance: 7.5, 
        seed: Math.floor(Math.random() * 1000000) 
      }
    }
    
    console.log("🔧 Preparing image data for editor:", imageData)
    
    // Store in session storage for the editor
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("editImageData", JSON.stringify(imageData))
        console.log("✅ Image data stored in sessionStorage")
      }
      
      // Call the edit callback
      onEditImage(imageData)
      playSound?.("click")
      
      console.log("✅ Edit callback executed")
      showToast("Opening image in editor...", "success")
    } catch (error) {
      console.error("❌ Failed to prepare image for editing:", error)
      showToast("Failed to prepare image for editing. Please try again.", "error")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-t-transparent border-purple-400 rounded-full animate-spin mx-auto"></div>
          <div className="text-purple-400 font-mono text-xl uppercase tracking-wide">LOADING GALLERY</div>
        </div>
      </div>
    )
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
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #00ff00 2px, #00ff00 4px)",
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
            <Badge variant="outline" className="font-mono text-xs text-cyan-400 border-cyan-400/50">
              {images.length} IMAGES
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex border-2 border-gray-600 rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-none font-mono text-xs"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-none font-mono text-xs"
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

        {/* Gallery Content */}
        <div className="relative z-10 p-4">
          {/* Debug info for development */}
          {process.env.NODE_ENV === 'development' && images.length > 0 && (
            <div className="mb-4 bg-gray-800/50 border border-yellow-600/50 rounded-lg p-3">
              <div className="text-xs font-mono text-yellow-400 mb-2">🔧 DEBUG INFO:</div>
              <div className="text-xs font-mono text-gray-400 space-y-1">
                <div>Total Images: {images.length}</div>
                <div>Images with URLs: {images.filter(img => img.imageUrl).length}</div>
                <div>Edit Callback: {onEditImage ? "✅ Available" : "❌ Missing"}</div>
                {images.slice(0, 2).map((img, idx) => (
                  <div key={idx} className="border-l-2 border-blue-400 pl-2 mt-1">
                    <div>Image {idx + 1}: {img.id.substring(0, 8)}...</div>
                    <div>URL: {img.imageUrl ? "✅ " + img.imageUrl.substring(0, 40) + "..." : "❌ Missing"}</div>
                    <div>Prompt: {img.prompt?.substring(0, 30) || "No prompt"}...</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
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
                💡 Create images in the generator, then save them here to edit later
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-4 space-y-4">
              {images.map((image) => (
                <GalleryGridItem
                  key={image.id}
                  image={image}
                  onToggleFavorite={toggleFavorite}
                  onDelete={deleteImage}
                  onDownload={downloadImage}
                  onShare={shareImage}
                  onEdit={editInImageEditor}
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
                  onToggleFavorite={toggleFavorite}
                  onDelete={deleteImage}
                  onDownload={downloadImage}
                  onShare={shareImage}
                  onEdit={editInImageEditor}
                  onOpenLightbox={openLightbox}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full w-full">
            {/* Close Button */}
            <Button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 z-10 bg-black/50 border-2 border-gray-600 text-white hover:border-red-400"
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
              className="max-w-full max-h-full object-contain mx-auto rounded-lg"
            />

            {/* Image Info */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm border-2 border-gray-600 rounded-lg p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="text-white font-mono text-sm mb-2">{lightboxImage.prompt}</p>
                  <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                    <Badge variant="outline" className="text-purple-400 border-purple-400/50">{lightboxImage.style}</Badge>
                    <span className="text-gray-300">{lightboxImage.timestamp.toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => toggleFavorite(lightboxImage.id)}
                    variant="ghost"
                    size="sm"
                    className={`${lightboxImage.isFavorite ? "text-red-400 hover:text-red-300" : "text-gray-400 hover:text-gray-300"} hover:bg-gray-700/50`}
                  >
                    <Heart className={`w-4 h-4 ${lightboxImage.isFavorite ? "fill-current" : ""}`} />
                  </Button>
                  <Button
                    onClick={() => {
                      console.log("🎨 Edit button clicked in lightbox for:", lightboxImage.id)
                      editInImageEditor(lightboxImage)
                      setLightboxImage(null) // Close lightbox after edit
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => downloadImage(lightboxImage)}
                    variant="ghost"
                    size="sm"
                    className="text-green-400 hover:text-green-300 hover:bg-green-500/20"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Gallery Grid Item Component
function GalleryGridItem({ 
  image, 
  onToggleFavorite, 
  onDelete, 
  onDownload, 
  onShare, 
  onEdit, 
  onOpenLightbox 
}: {
  image: GalleryImage
  onToggleFavorite: (id: string) => void
  onDelete: (id: string) => void
  onDownload: (image: GalleryImage) => void
  onShare: (image: GalleryImage) => void
  onEdit: (image: GalleryImage) => void
  onOpenLightbox: (image: GalleryImage) => void
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className="relative break-inside-avoid mb-4 group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpenLightbox(image)}
    >
      <div className="relative overflow-hidden rounded-lg border-2 border-gray-600 hover:border-purple-400 transition-all duration-300 bg-gray-800">
        <img
          src={image.imageUrl}
          alt={image.prompt}
          className="w-full h-auto object-cover transition-transform duration-300 hover:scale-105"
        />
        
        {/* Overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-300">
            <div className="flex items-center gap-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFavorite(image.id)
                }}
                variant="ghost"
                size="sm"
                className={`${image.isFavorite ? "text-red-400" : "text-gray-400"} hover:scale-110 hover:bg-red-500/20`}
              >
                <Heart className={`w-4 h-4 ${image.isFavorite ? "fill-current" : ""}`} />
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  console.log("🎨 Edit button clicked in grid for:", image.id)
                  console.log("📸 Image data:", { url: image.imageUrl, prompt: image.prompt, style: image.style })
                  onEdit(image)
                }}
                variant="ghost"
                size="sm"
                className="text-purple-400 hover:scale-110 hover:bg-purple-500/20"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  onDownload(image)
                }}
                variant="ghost"
                size="sm"
                className="text-green-400 hover:scale-110 hover:bg-green-500/20"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(image.id)
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
          <p className="text-white text-xs font-mono truncate mb-1">{image.prompt}</p>
          <div className="flex justify-between items-center">
            <Badge variant="outline" className="text-xs font-mono text-purple-400 border-purple-400/50">
              {image.style}
            </Badge>
            <span className="text-xs font-mono text-gray-300">
              {image.timestamp.toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Favorite Heart */}
        {image.isFavorite && (
          <div className="absolute top-2 right-2">
            <Heart className="w-5 h-5 text-red-400 fill-current" />
          </div>
        )}
      </div>
    </div>
  )
}

// Gallery List Item Component
function GalleryListItem({ 
  image, 
  onToggleFavorite, 
  onDelete, 
  onDownload, 
  onShare, 
  onEdit, 
  onOpenLightbox 
}: {
  image: GalleryImage
  onToggleFavorite: (id: string) => void
  onDelete: (id: string) => void
  onDownload: (image: GalleryImage) => void
  onShare: (image: GalleryImage) => void
  onEdit: (image: GalleryImage) => void
  onOpenLightbox: (image: GalleryImage) => void
}) {
  return (
    <div className="bg-gray-800 border-2 border-gray-600 hover:border-purple-400 rounded-lg p-4 transition-all duration-300">
      <div className="flex gap-4">
        <div 
          className="flex-shrink-0 cursor-pointer"
          onClick={() => onOpenLightbox(image)}
        >
          <img
            src={image.imageUrl}
            alt={image.prompt}
            className="w-24 h-24 object-cover rounded-lg hover:scale-105 transition-transform"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-mono text-sm mb-2 line-clamp-2">{image.prompt}</h3>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="text-xs font-mono text-purple-400 border-purple-400/50">
              {image.style}
            </Badge>
            <span className="text-xs font-mono text-gray-400">
              {image.timestamp.toLocaleDateString()}
            </span>
            {image.isFavorite && (
              <Heart className="w-4 h-4 text-red-400 fill-current" />
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => onToggleFavorite(image.id)}
              variant="ghost"
              size="sm"
              className={`${image.isFavorite ? "text-red-400 hover:text-red-300" : "text-gray-400 hover:text-gray-300"} font-mono text-xs hover:bg-gray-700/50`}
            >
              <Heart className={`w-3 h-3 mr-1 ${image.isFavorite ? "fill-current" : ""}`} />
              FAVORITE
            </Button>
            <Button
              onClick={() => {
                console.log("🎨 Edit button clicked in list for:", image.id)
                console.log("📸 Image data:", { url: image.imageUrl, prompt: image.prompt, style: image.style })
                onEdit(image)
              }}
              variant="ghost"
              size="sm"
              className="text-purple-400 hover:text-purple-300 font-mono text-xs hover:bg-purple-500/20"
            >
              <Edit3 className="w-3 h-3 mr-1" />
              EDIT
            </Button>
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
  )
}
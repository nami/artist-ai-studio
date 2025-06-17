"use client"

import { useState, useEffect } from "react"
import { 
  Download, 
  Trash2, 
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
  deleteGalleryImage,
} from "@/utils/gallery-storage"

interface ImageGalleryProps {
  onBack: () => void
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

export function ImageGallery({ onBack, playSound }: ImageGalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Add escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxImage) {
        setLightboxImage(null)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [lightboxImage])

  // Load images on mount
  useEffect(() => {
    const loadImages = () => {
      const galleryImages = getGalleryImages()
      // Sort by newest first
      galleryImages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      setImages(galleryImages)
      setIsLoading(false)
    }
    loadImages()
  }, [])

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
        console.error("Error sharing:", error)
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
                💡 Create images in the generator, then save them here to edit later
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
                  onShare={shareImage}
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
                  onShare={shareImage}
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
              setLightboxImage(null)
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
                    onClick={() => downloadImage(lightboxImage)}
                    variant="ghost"
                    size="sm"
                    className="text-green-400 hover:text-green-300 hover:bg-green-500/20"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      deleteImage(lightboxImage.id)
                      setLightboxImage(null)
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
  )
}

// Gallery Grid Item Component
function GalleryGridItem({ 
  image, 
  onDelete, 
  onDownload, 
  onShare, 
  onOpenLightbox 
}: {
  image: GalleryImage
  onDelete: (id: string) => void
  onDownload: (image: GalleryImage) => void
  onShare: (image: GalleryImage) => void
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
      </div>
    </div>
  )
}

// Gallery List Item Component
function GalleryListItem({ 
  image, 
  onDelete, 
  onDownload, 
  onShare, 
  onOpenLightbox 
}: {
  image: GalleryImage
  onDelete: (id: string) => void
  onDownload: (image: GalleryImage) => void
  onShare: (image: GalleryImage) => void
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
  )
}
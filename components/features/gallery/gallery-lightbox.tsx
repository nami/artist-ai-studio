"use client"

import { X, ChevronLeft, ChevronRight, Heart, Download, Share2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RetroBadge } from "@/components/ui/retro-badge"
import type { GalleryImage } from "@/utils/gallery-storage"

interface GalleryLightboxProps {
  image: GalleryImage | null
  isOpen: boolean
  onClose: () => void
  onNavigate: (direction: "prev" | "next") => void
  onToggleFavorite: (id: string) => void
  onDownload: (image: GalleryImage) => void
  onShare: (image: GalleryImage) => void
  onEdit: (image: GalleryImage) => void
  hasMultipleImages: boolean
  styleName: string
}

export function GalleryLightbox({
  image,
  isOpen,
  onClose,
  onNavigate,
  onToggleFavorite,
  onDownload,
  onShare,
  onEdit,
  hasMultipleImages,
  styleName,
}: GalleryLightboxProps) {
  if (!isOpen || !image) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4">
      <div className="relative max-w-7xl max-h-full w-full">
        {/* Close Button */}
        <Button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 border-2 border-gray-600 text-white hover:bg-black/70"
          size="sm"
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Navigation Buttons */}
        {hasMultipleImages && (
          <>
            <Button
              onClick={() => onNavigate("prev")}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 border-2 border-gray-600 text-white hover:bg-black/70"
              size="sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => onNavigate("next")}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 border-2 border-gray-600 text-white hover:bg-black/70"
              size="sm"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}

        {/* Image */}
        <div className="flex items-center justify-center h-full">
          <img
            src={image.imageUrl || "/placeholder.svg"}
            alt={image.prompt}
            className="max-w-full max-h-full object-contain rounded-lg border-4 border-gray-600"
          />
        </div>

        {/* Image Info */}
        <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm border-2 border-gray-600 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-white font-mono text-sm mb-2">{image.prompt}</div>
              <div className="flex items-center gap-2 mb-2">
                <RetroBadge>{styleName}</RetroBadge>
                <div className="text-xs text-gray-400 font-mono">{image.timestamp.toLocaleString()}</div>
              </div>
              <div className="text-xs text-gray-400 font-mono">
                Seed: {image.settings.seed} • Steps: {image.settings.steps} • Guidance: {image.settings.guidance}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                onClick={() => onToggleFavorite(image.id)}
                className="bg-red-900/50 border-red-400/50 text-red-300 hover:bg-red-800/50"
              >
                <Heart className={`w-4 h-4 ${image.isFavorite ? "fill-current" : ""}`} />
              </Button>
              <Button
                size="sm"
                onClick={() => onDownload(image)}
                className="bg-green-900/50 border-green-400/50 text-green-300 hover:bg-green-800/50"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => onShare(image)}
                className="bg-blue-900/50 border-blue-400/50 text-blue-300 hover:bg-blue-800/50"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => onEdit(image)}
                className="bg-yellow-900/50 border-yellow-400/50 text-yellow-300 hover:bg-yellow-800/50"
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

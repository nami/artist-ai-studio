"use client"
import { Heart, Eye, Download, Share2, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RetroBadge } from "@/components/ui/retro-badge"
import type { GalleryImage } from "@/utils/gallery-storage"

interface GalleryGridItemProps {
  image: GalleryImage
  isSelectionMode: boolean
  isSelected: boolean
  onToggleSelection: (id: string) => void
  onToggleFavorite: (id: string) => void
  onDelete: (id: string) => void
  onDownload: (image: GalleryImage) => void
  onShare: (image: GalleryImage) => void
  onEdit: (image: GalleryImage) => void
  onOpenLightbox: (image: GalleryImage) => void
  styleName: string
}

export function GalleryGridItem({
  image,
  isSelectionMode,
  isSelected,
  onToggleSelection,
  onToggleFavorite,
  onDelete,
  onDownload,
  onShare,
  onEdit,
  onOpenLightbox,
  styleName,
}: GalleryGridItemProps) {
  return (
    <div className="break-inside-avoid relative group bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600 hover:border-purple-400 transition-all duration-300 hover:scale-105">
      {/* Selection Checkbox */}
      {isSelectionMode && (
        <div className="absolute top-2 left-2 z-20">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(image.id)}
            className="bg-black/50 border-white"
          />
        </div>
      )}

      {/* Image */}
      <div className="relative cursor-pointer" onClick={() => onOpenLightbox(image)}>
        <img
          data-src={image.imageUrl || "/placeholder.svg"}
          alt={image.prompt}
          className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />

        {/* Enhanced Overlay with better visibility */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-80 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center gap-2">
            <Eye className="w-8 h-8 text-cyan-400 animate-pulse" />
            <div className="text-cyan-400 font-mono text-xs uppercase tracking-wide bg-black/80 px-2 py-1 rounded">
              CLICK TO VIEW
            </div>
          </div>
        </div>

        {/* Favorite Badge with glow effect */}
        {image.isFavorite && (
          <div className="absolute top-2 right-2 animate-pulse">
            <div className="relative">
              <Heart className="w-6 h-6 text-red-400 fill-current drop-shadow-lg" />
              <div className="absolute inset-0 w-6 h-6 text-red-400 fill-current animate-ping opacity-75">
                <Heart className="w-6 h-6" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Action Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
        <div className="space-y-2">
          <div className="text-white text-xs font-mono line-clamp-2 bg-black/50 p-2 rounded border border-purple-400/30">
            {image.prompt}
          </div>
          <div className="flex items-center justify-between">
            <RetroBadge variant="gradient">{styleName}</RetroBadge>
            <div className="text-xs text-cyan-400 font-mono bg-black/50 px-2 py-1 rounded">
              {image.timestamp.toLocaleDateString()}
            </div>
          </div>

          {/* Enhanced Action Buttons with better visibility */}
          <div className="flex items-center justify-center gap-1 bg-black/80 p-2 rounded-lg border border-gray-600/50">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite(image.id)
              }}
              className="p-2 h-auto bg-red-900/50 border border-red-400/50 text-red-300 hover:bg-red-800/80 hover:scale-110 transition-all"
            >
              <Heart className={`w-4 h-4 ${image.isFavorite ? "fill-current animate-pulse" : ""}`} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onDownload(image)
              }}
              className="p-2 h-auto bg-green-900/50 border border-green-400/50 text-green-300 hover:bg-green-800/80 hover:scale-110 transition-all"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onShare(image)
              }}
              className="p-2 h-auto bg-blue-900/50 border border-blue-400/50 text-blue-300 hover:bg-blue-800/80 hover:scale-110 transition-all"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(image)
              }}
              className="p-2 h-auto bg-yellow-900/50 border border-yellow-400/50 text-yellow-300 hover:bg-yellow-800/80 hover:scale-110 transition-all"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(image.id)
              }}
              className="p-2 h-auto bg-red-900/50 border border-red-400/50 text-red-300 hover:bg-red-800/80 hover:scale-110 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

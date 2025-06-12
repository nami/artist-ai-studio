"use client"

import { Heart, Download, Share2, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RetroBadge } from "@/components/ui/retro-badge"
import type { GalleryImage } from "@/utils/gallery-storage"

interface GalleryListItemProps {
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

export function GalleryListItem({
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
}: GalleryListItemProps) {
  return (
    <div className="flex gap-4 bg-gray-800/50 border-2 border-gray-600 hover:border-purple-400 rounded-lg p-4 transition-all duration-300">
      {isSelectionMode && (
        <div className="flex items-center">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(image.id)}
            className="bg-black/50 border-white"
          />
        </div>
      )}

      <img
        data-src={image.imageUrl || "/placeholder.svg"}
        alt={image.prompt}
        className="w-24 h-24 object-cover rounded border-2 border-gray-600 cursor-pointer"
        onClick={() => onOpenLightbox(image)}
        loading="lazy"
      />

      <div className="flex-1 space-y-2">
        <div className="text-white font-mono text-sm">{image.prompt}</div>
        <div className="flex items-center gap-2">
          <RetroBadge>{styleName}</RetroBadge>
          <div className="text-xs text-gray-400 font-mono">{image.timestamp.toLocaleString()}</div>
          {image.isFavorite && <Heart className="w-4 h-4 text-red-400 fill-current" />}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onToggleFavorite(image.id)}
          className="text-gray-400 hover:text-red-400"
        >
          <Heart className={`w-4 h-4 ${image.isFavorite ? "fill-current text-red-400" : ""}`} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDownload(image)}
          className="text-gray-400 hover:text-green-400"
        >
          <Download className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onShare(image)} className="text-gray-400 hover:text-blue-400">
          <Share2 className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onEdit(image)} className="text-gray-400 hover:text-yellow-400">
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(image.id)}
          className="text-gray-400 hover:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

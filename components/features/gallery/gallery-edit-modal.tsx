"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { GalleryImage } from "@/utils/gallery-storage"

interface GalleryEditModalProps {
  image: GalleryImage | null
  isOpen: boolean
  onClose: () => void
  onSave: (image: GalleryImage) => void
  onChange: (image: GalleryImage) => void
}

export function GalleryEditModal({ image, isOpen, onClose, onSave, onChange }: GalleryEditModalProps) {
  if (!isOpen || !image) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
      <div className="bg-gray-900 border-4 border-gray-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold font-mono text-white uppercase tracking-wide">EDIT ARTWORK</h2>
          <Button onClick={onClose} className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-mono text-white uppercase tracking-wide mb-2 block">PROMPT</Label>
            <Textarea
              value={image.prompt}
              onChange={(e) => onChange({ ...image, prompt: e.target.value })}
              className="bg-gray-800/50 border-gray-600 text-white font-mono resize-none focus:border-purple-400"
              rows={3}
            />
          </div>

          <div>
            <Label className="text-sm font-mono text-white uppercase tracking-wide mb-2 block">
              TAGS (comma separated)
            </Label>
            <Input
              value={image.tags.join(", ")}
              onChange={(e) =>
                onChange({
                  ...image,
                  tags: e.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                })
              }
              className="bg-gray-800/50 border-gray-600 text-white font-mono focus:border-purple-400"
              placeholder="fantasy, portrait, colorful"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="favorite"
                checked={image.isFavorite}
                onCheckedChange={(checked) =>
                  onChange({
                    ...image,
                    isFavorite: checked as boolean,
                  })
                }
              />
              <Label htmlFor="favorite" className="text-sm font-mono text-white">
                FAVORITE
              </Label>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              onClick={() => onSave(image)}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-mono uppercase tracking-wide"
            >
              SAVE CHANGES
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 font-mono uppercase tracking-wide"
            >
              CANCEL
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

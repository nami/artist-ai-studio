"use client"

import { Grid, List, Check, Trash2 } from "lucide-react"
import { RetroButton } from "@/components/ui/retro-button"

interface GalleryToolbarProps {
  viewMode: "grid" | "list"
  onViewModeChange: (mode: "grid" | "list") => void
  isSelectionMode: boolean
  onSelectionModeToggle: () => void
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onDeleteSelected: () => void
  filteredCount: number
  totalImages: number
}

export function GalleryToolbar({
  viewMode,
  onViewModeChange,
  isSelectionMode,
  onSelectionModeToggle,
  selectedCount,
  totalCount,
  onSelectAll,
  onDeleteSelected,
  filteredCount,
  totalImages,
}: GalleryToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <RetroButton
          onClick={() => onViewModeChange(viewMode === "grid" ? "list" : "grid")}
          variant="secondary"
          size="sm"
          icon={viewMode === "grid" ? List : Grid} children={undefined}        />

        <RetroButton onClick={onSelectionModeToggle} variant="primary" size="sm" icon={Check}>
          {isSelectionMode ? "EXIT SELECT" : "SELECT"}
        </RetroButton>

        {isSelectionMode && (
          <>
            <RetroButton onClick={onSelectAll} variant="primary" size="sm">
              {selectedCount === totalCount ? "DESELECT ALL" : "SELECT ALL"}
            </RetroButton>

            {selectedCount > 0 && (
              <RetroButton onClick={onDeleteSelected} variant="danger" size="sm" icon={Trash2}>
                DELETE ({selectedCount})
              </RetroButton>
            )}
          </>
        )}
      </div>

      <div className="text-sm text-gray-400 font-mono">
        {filteredCount} of {totalImages} images
      </div>
    </div>
  )
}

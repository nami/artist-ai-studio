"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { RetroContainer } from "@/components/layouts/retro-container"
import { GalleryHeader } from "@/components/features/gallery/gallery-header"
import { GalleryFilters } from "@/components/features/gallery/gallery-filters"
import { GalleryToolbar } from "@/components/features/gallery/gallery-toolbar"
import { GalleryEmptyState } from "@/components/features/gallery/gallery-empty-state"
import { GalleryGridItem } from "@/components/features/gallery/gallery-grid-item"
import { GalleryListItem } from "@/components/features/gallery/gallery-list-item"
import { GalleryLightbox } from "@/components/features/gallery/gallery-lightbox"
import { GalleryEditModal } from "@/components/features/gallery/gallery-edit-modal"
import {
  type GalleryImage,
  getGalleryImages,
  updateGalleryImage,
  deleteGalleryImage,
  deleteMultipleGalleryImages,
} from "@/utils/gallery-storage"

interface ImageGalleryProps {
  onBack: () => void
  playSound: (sound: string) => void
}

const STYLE_PRESETS = [
  { id: "retro-pixel", name: "Retro Pixel Art", color: "from-green-500 to-lime-400" },
  { id: "cyberpunk", name: "Cyberpunk", color: "from-purple-500 to-pink-400" },
  { id: "synthwave", name: "Synthwave", color: "from-pink-500 to-orange-400" },
  { id: "vaporwave", name: "Vaporwave", color: "from-cyan-500 to-purple-400" },
  { id: "neon-noir", name: "Neon Noir", color: "from-blue-500 to-cyan-400" },
  { id: "glitch-art", name: "Glitch Art", color: "from-red-500 to-yellow-400" },
]

export function ImageGallery({ onBack, playSound }: ImageGalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [filteredImages, setFilteredImages] = useState<GalleryImage[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStyle, setSelectedStyle] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("newest")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadedImagesRef = useRef<Set<string>>(new Set())

  // Load images on mount
  useEffect(() => {
    const loadImages = () => {
      const galleryImages = getGalleryImages()
      setImages(galleryImages)
      setIsLoading(false)
    }
    loadImages()
  }, [])

  // Filter and sort images
  useEffect(() => {
    let filtered = [...images]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (img) =>
          img.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
          img.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    // Style filter
    if (selectedStyle !== "all") {
      filtered = filtered.filter((img) => img.style === selectedStyle)
    }

    // Date filter
    if (selectedDate !== "all") {
      const now = new Date()
      const filterDate = new Date()

      switch (selectedDate) {
        case "today":
          filterDate.setHours(0, 0, 0, 0)
          filtered = filtered.filter((img) => img.timestamp >= filterDate)
          break
        case "week":
          filterDate.setDate(now.getDate() - 7)
          filtered = filtered.filter((img) => img.timestamp >= filterDate)
          break
        case "month":
          filterDate.setMonth(now.getMonth() - 1)
          filtered = filtered.filter((img) => img.timestamp >= filterDate)
          break
      }
    }

    // Sort
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        break
      case "oldest":
        filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        break
      case "favorites":
        filtered.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))
        break
    }

    setFilteredImages(filtered)
  }, [images, searchQuery, selectedStyle, selectedDate, sortBy])

  // Lazy loading setup
  const setupLazyLoading = useCallback((node: HTMLImageElement | null) => {
    if (!node) return

    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            const src = img.dataset.src
            if (src && !loadedImagesRef.current.has(src)) {
              img.src = src
              loadedImagesRef.current.add(src)
              observerRef.current?.unobserve(img)
            }
          }
        })
      },
      { threshold: 0.1 },
    )

    const images = document.querySelectorAll("img[data-src]")
    images.forEach((img) => observerRef.current?.observe(img))
  }, [])

  useEffect(() => {
    setupLazyLoading(null)
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [setupLazyLoading, filteredImages])

  const toggleFavorite = (id: string) => {
    const image = images.find((img) => img.id === id)
    if (image) {
      const updated = { ...image, isFavorite: !image.isFavorite }
      updateGalleryImage(id, updated)
      setImages((prev) => prev.map((img) => (img.id === id ? updated : img)))
      playSound(updated.isFavorite ? "complete" : "click")
    }
  }

  const deleteImage = (id: string) => {
    deleteGalleryImage(id)
    setImages((prev) => prev.filter((img) => img.id !== id))
    playSound("delete")
  }

  const deleteSelectedImages = () => {
    const ids = Array.from(selectedImages)
    deleteMultipleGalleryImages(ids)
    setImages((prev) => prev.filter((img) => !selectedImages.has(img.id)))
    setSelectedImages(new Set())
    setIsSelectionMode(false)
    playSound("delete")
  }

  const downloadImage = (image: GalleryImage) => {
    const link = document.createElement("a")
    link.href = image.imageUrl
    link.download = `ai-art-${image.id}.png`
    link.click()
    playSound("click")
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
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(image.imageUrl)
      playSound("click")
    }
  }

  const openLightbox = (image: GalleryImage) => {
    const index = filteredImages.findIndex((img) => img.id === image.id)
    setLightboxImage(image)
    setLightboxIndex(index)
    playSound("click")
  }

  const navigateLightbox = (direction: "prev" | "next") => {
    const newIndex =
      direction === "prev"
        ? (lightboxIndex - 1 + filteredImages.length) % filteredImages.length
        : (lightboxIndex + 1) % filteredImages.length

    setLightboxIndex(newIndex)
    setLightboxImage(filteredImages[newIndex])
    playSound("hover")
  }

  const toggleImageSelection = (id: string) => {
    const newSelected = new Set(selectedImages)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedImages(newSelected)
    playSound("click")
  }

  const selectAllImages = () => {
    if (selectedImages.size === filteredImages.length) {
      setSelectedImages(new Set())
    } else {
      setSelectedImages(new Set(filteredImages.map((img) => img.id)))
    }
    playSound("click")
  }

  const saveImageEdit = (updatedImage: GalleryImage) => {
    updateGalleryImage(updatedImage.id, updatedImage)
    setImages((prev) => prev.map((img) => (img.id === updatedImage.id ? updatedImage : img)))
    setEditingImage(null)
    playSound("complete")
  }

  const getStyleName = (styleId: string) => {
    return STYLE_PRESETS.find((s) => s.id === styleId)?.name || "Unknown Style"
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
    <RetroContainer>
      <GalleryHeader imageCount={filteredImages.length} onBack={onBack} playSound={playSound} />

      {/* Controls */}
      <div className="relative z-10 space-y-4 mb-6">
        <GalleryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStyle={selectedStyle}
          onStyleChange={setSelectedStyle}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        <GalleryToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isSelectionMode={isSelectionMode}
          onSelectionModeToggle={() => {
            setIsSelectionMode(!isSelectionMode)
            setSelectedImages(new Set())
          }}
          selectedCount={selectedImages.size}
          totalCount={filteredImages.length}
          onSelectAll={selectAllImages}
          onDeleteSelected={deleteSelectedImages}
          filteredCount={filteredImages.length}
          totalImages={images.length}
        />
      </div>

      {/* Gallery Content */}
      <div className="relative z-10">
        {filteredImages.length === 0 ? (
          <GalleryEmptyState />
        ) : viewMode === "grid" ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-4 space-y-4">
            {filteredImages.map((image) => (
              <GalleryGridItem
                key={image.id}
                image={image}
                isSelectionMode={isSelectionMode}
                isSelected={selectedImages.has(image.id)}
                onToggleSelection={toggleImageSelection}
                onToggleFavorite={toggleFavorite}
                onDelete={deleteImage}
                onDownload={downloadImage}
                onShare={shareImage}
                onEdit={setEditingImage}
                onOpenLightbox={openLightbox}
                styleName={getStyleName(image.style)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredImages.map((image) => (
              <GalleryListItem
                key={image.id}
                image={image}
                isSelectionMode={isSelectionMode}
                isSelected={selectedImages.has(image.id)}
                onToggleSelection={toggleImageSelection}
                onToggleFavorite={toggleFavorite}
                onDelete={deleteImage}
                onDownload={downloadImage}
                onShare={shareImage}
                onEdit={setEditingImage}
                onOpenLightbox={openLightbox}
                styleName={getStyleName(image.style)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <GalleryLightbox
        image={lightboxImage}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        onNavigate={navigateLightbox}
        onToggleFavorite={toggleFavorite}
        onDownload={downloadImage}
        onShare={shareImage}
        onEdit={setEditingImage}
        hasMultipleImages={filteredImages.length > 1}
        styleName={lightboxImage ? getStyleName(lightboxImage.style) : ""}
      />

      <GalleryEditModal
        image={editingImage}
        isOpen={!!editingImage}
        onClose={() => setEditingImage(null)}
        onSave={saveImageEdit}
        onChange={setEditingImage}
      />
    </RetroContainer>
  )
}

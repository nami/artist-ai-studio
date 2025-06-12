"use client"

import { SearchInput } from "@/components/ui/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface GalleryFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedStyle: string
  onStyleChange: (value: string) => void
  selectedDate: string
  onDateChange: (value: string) => void
  sortBy: string
  onSortChange: (value: string) => void
}

const STYLE_PRESETS = [
  { id: "retro-pixel", name: "Retro Pixel Art" },
  { id: "cyberpunk", name: "Cyberpunk" },
  { id: "synthwave", name: "Synthwave" },
  { id: "vaporwave", name: "Vaporwave" },
  { id: "neon-noir", name: "Neon Noir" },
  { id: "glitch-art", name: "Glitch Art" },
]

export function GalleryFilters({
  searchQuery,
  onSearchChange,
  selectedStyle,
  onStyleChange,
  selectedDate,
  onDateChange,
  sortBy,
  onSortChange,
}: GalleryFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Search */}
      <SearchInput value={searchQuery} onChange={onSearchChange} placeholder="Search prompts, tags..." />

      {/* Style Filter */}
      <Select value={selectedStyle} onValueChange={onStyleChange}>
        <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white font-mono">
          <SelectValue placeholder="Filter by style" />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600">
          <SelectItem value="all" className="text-white font-mono">
            All Styles
          </SelectItem>
          {STYLE_PRESETS.map((style) => (
            <SelectItem key={style.id} value={style.id} className="text-white font-mono">
              {style.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Filter */}
      <Select value={selectedDate} onValueChange={onDateChange}>
        <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white font-mono">
          <SelectValue placeholder="Filter by date" />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600">
          <SelectItem value="all" className="text-white font-mono">
            All Time
          </SelectItem>
          <SelectItem value="today" className="text-white font-mono">
            Today
          </SelectItem>
          <SelectItem value="week" className="text-white font-mono">
            This Week
          </SelectItem>
          <SelectItem value="month" className="text-white font-mono">
            This Month
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white font-mono">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600">
          <SelectItem value="newest" className="text-white font-mono">
            Newest First
          </SelectItem>
          <SelectItem value="oldest" className="text-white font-mono">
            Oldest First
          </SelectItem>
          <SelectItem value="favorites" className="text-white font-mono">
            Favorites First
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

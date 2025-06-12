"use client"

import { ArrowLeft } from "lucide-react"
import { RetroButton } from "@/components/ui/retro-button"
import { RetroBadge } from "@/components/ui/retro-badge"

interface GalleryHeaderProps {
  imageCount: number
  onBack: () => void
  playSound: (sound: string) => void
}

export function GalleryHeader({ imageCount, onBack, playSound }: GalleryHeaderProps) {
  return (
    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-400 p-1 rounded-lg animate-pulse">
          <div className="bg-black px-4 py-2 rounded-md relative overflow-hidden">
            <h1 className="text-xl md:text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 uppercase tracking-wider relative z-10">
              🖼️ RETRO ART VAULT 🖼️
            </h1>
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-pulse"></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
          </div>
          <RetroBadge variant="pulsing">{imageCount} EPIC ARTWORKS</RetroBadge>
        </div>
      </div>
      <RetroButton
        onClick={() => {
          playSound("click")
          onBack()
        }}
        variant="primary"
        icon={ArrowLeft}
        className="bg-gradient-to-r from-blue-900/80 to-cyan-900/80 border-2 border-blue-400/50 text-blue-300 hover:bg-blue-800/80 shadow-lg shadow-blue-500/25"
      >
        BACK TO GENERATOR
      </RetroButton>
    </div>
  )
}

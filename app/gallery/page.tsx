"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ImageGallery } from "@/components/image-gallery"
import { useSoundEffects } from "@/hooks/use-sound-effects"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function Gallery() {
  const router = useRouter()
  const { play, initialize } = useSoundEffects()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Initialize sound system
    initialize()
    setIsLoading(false)
  }, [initialize])

  const handleBack = useCallback(() => {
    router.push("/generate")
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-t-transparent border-cyan-400 rounded-full animate-spin mx-auto"></div>
          <div className="text-cyan-400 font-mono text-xl uppercase tracking-wide">LOADING GALLERY</div>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black">
        <ImageGallery onBack={handleBack} playSound={(sound: string) => play(sound as "click" | "complete")} />
      </div>
    </ProtectedRoute>
  )
}

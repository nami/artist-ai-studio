"use client"
import { useSound } from "@/contexts/sound-context"

// This is now just a wrapper around the global sound context
// to maintain backward compatibility with existing components
export function useSoundEffects() {
  const { play, isMuted, toggleMute, initialize } = useSound()

  return {
    play,
    isMuted,
    toggleMute,
    initialize,
  }
}

// Re-export the SoundEffect type for convenience
export type { SoundEffect } from "@/contexts/sound-context"

"use client"
import { Volume2, VolumeX } from "lucide-react"

interface SoundEffectsProps {
  isMuted: boolean
  toggleMute: () => void
}

export function SoundEffects({ isMuted, toggleMute }: SoundEffectsProps) {
  return (
    <button
      onClick={toggleMute}
      className="fixed bottom-4 right-4 z-50 bg-black border-2 border-gray-600 p-2 rounded-full hover:border-cyan-400 transition-colors duration-300"
      aria-label={isMuted ? "Unmute sound effects" : "Mute sound effects"}
    >
      {isMuted ? <VolumeX className="w-5 h-5 text-gray-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
    </button>
  )
}

"use client"

import type React from "react"
import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react"

export type SoundEffect =
  | "hover"
  | "click"
  | "upload"
  | "complete"
  | "error"
  | "delete"
  | "drop"
  | "levelUp"
  | "success"
  | "generate"
  | "switch"
  | "notification"

interface SoundContextType {
  play: (sound: SoundEffect) => void // Add this for backward compatibility
  playSound: (sound: SoundEffect) => void
  isMuted: boolean
  toggleMute: () => void
  initialize: () => void
}

const SoundContext = createContext<SoundContextType | undefined>(undefined)

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const activeOscillatorsRef = useRef<Set<OscillatorNode>>(new Set())
  const [isMuted, setIsMuted] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const isClient = typeof window !== "undefined"

  const initializeAudioContext = useCallback(() => {
    if (!audioContextRef.current && isClient) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        console.log("Audio context initialized")
      } catch (e) {
        console.error("Failed to initialize audio context:", e)
      }
    }
    setIsInitialized(true)
  }, [isClient])

  // Stop all active sounds immediately
  const stopAllSounds = useCallback(() => {
    // Stop all oscillators
    activeOscillatorsRef.current.forEach((oscillator) => {
      try {
        oscillator.stop()
      } catch (e) {
        // Oscillator might already be stopped
      }
    })
    activeOscillatorsRef.current.clear()

    console.log("All sounds stopped")
  }, [])

  // Generate retro 8-bit style sounds using Web Audio API
  const generateSound = useCallback(
    (type: SoundEffect) => {
      if (!audioContextRef.current || isMuted || !isInitialized || !isClient) return

      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      // Track active oscillators
      activeOscillatorsRef.current.add(oscillator)

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      // Clean up when oscillator ends
      oscillator.onended = () => {
        activeOscillatorsRef.current.delete(oscillator)
      }

      // Configure sound based on type
      switch (type) {
        case "hover":
          oscillator.frequency.setValueAtTime(800, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1)
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
          oscillator.type = "square"
          break

        case "click":
          oscillator.frequency.setValueAtTime(1200, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1)
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
          oscillator.type = "square"
          break

        case "upload":
          oscillator.frequency.setValueAtTime(400, ctx.currentTime)
          oscillator.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.2)
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
          oscillator.type = "sawtooth"
          break

        case "complete":
        case "success":
          // Success sound - ascending notes
          oscillator.frequency.setValueAtTime(523, ctx.currentTime) // C5
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1) // E5
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2) // G5
          oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.3) // C6
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
          oscillator.type = "square"
          break

        case "error":
          oscillator.frequency.setValueAtTime(200, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3)
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
          oscillator.type = "sawtooth"
          break

        case "delete":
          oscillator.frequency.setValueAtTime(800, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2)
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
          oscillator.type = "square"
          break

        case "drop":
          oscillator.frequency.setValueAtTime(300, ctx.currentTime)
          oscillator.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.1)
          oscillator.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.3)
          gainNode.gain.setValueAtTime(0.25, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
          oscillator.type = "triangle"
          break

        case "levelUp":
        case "generate":
          // Level up fanfare
          oscillator.frequency.setValueAtTime(523, ctx.currentTime) // C5
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.15) // E5
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.3) // G5
          oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.45) // C6
          oscillator.frequency.setValueAtTime(1319, ctx.currentTime + 0.6) // E6
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8)
          oscillator.type = "square"
          break

        case "switch":
        case "notification":
          oscillator.frequency.setValueAtTime(600, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.1)
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
          oscillator.type = "triangle"
          break
      }

      const duration =
        type === "complete" || type === "success"
          ? 0.5
          : type === "levelUp" || type === "generate"
            ? 0.8
            : type === "error"
              ? 0.3
              : type === "drop"
                ? 0.3
                : 0.1

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration)
    },
    [isMuted, isInitialized, isClient],
  )

  const playSound = useCallback(
    (sound: SoundEffect) => {
      if (!isMuted) {
        generateSound(sound)
      }
    },
    [generateSound, isMuted],
  )

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev
      if (newMuted) {
        // Stop all currently playing sounds when muting
        stopAllSounds()
      }

      // Save to localStorage
      if (isClient) {
        try {
          localStorage.setItem("sound-muted", JSON.stringify(newMuted))
        } catch (e) {
          console.error("Failed to save mute state to localStorage:", e)
        }
      }

      return newMuted
    })
  }, [stopAllSounds, isClient])

  const initialize = useCallback(() => {
    initializeAudioContext()
  }, [initializeAudioContext])

  // Load mute state from localStorage
  useEffect(() => {
    if (isClient) {
      try {
        const savedMuteState = localStorage.getItem("sound-muted")
        if (savedMuteState !== null) {
          setIsMuted(JSON.parse(savedMuteState))
        }
      } catch (e) {
        console.error("Failed to load mute state from localStorage:", e)
      }
    }
  }, [isClient])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllSounds()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [stopAllSounds])

  return (
    <SoundContext.Provider
      value={{
        play: playSound, // Alias for backward compatibility
        playSound,
        isMuted,
        toggleMute,
        initialize,
      }}
    >
      {children}
    </SoundContext.Provider>
  )
}

export function useSound() {
  const context = useContext(SoundContext)
  if (context === undefined) {
    throw new Error("useSound must be used within a SoundProvider")
  }
  return context
}

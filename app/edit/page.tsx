"use client"

import React from "react"
import { useState, useEffect } from "react"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import AIImageEditor from "@/components/ai-image-editor"

interface AnimatedElement {
  id: number;
  left: number;
  top: number;
  animationDelay: number;
  animationDuration: number;
}

export default function EditPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [animatedElements, setAnimatedElements] = useState<AnimatedElement[]>([])

  useEffect(() => {
    // Set client-side flag and generate animated elements
    setIsClient(true);
    
    // Delay animation generation to ensure hydration is complete
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        // Generate animated elements once on client side
        const elements: AnimatedElement[] = Array.from({ length: 8 }, (_, i) => ({
          id: i,
          left: Math.random() * 100,
          top: Math.random() * 100,
          animationDelay: Math.random() * 3,
          animationDuration: 2 + Math.random() * 4,
        }));
        
        setAnimatedElements(elements);
      }
    }, 200); // Small delay to ensure hydration is complete

    // Simple check if we're in a browser environment and have sessionStorage
    const checkEnvironment = () => {
      try {
        if (typeof window === 'undefined') {
          setError("Editor not available in server environment")
          return
        }

        // Optional: Check if there's image data available
        const hasImageData = sessionStorage?.getItem('editImageData')
        if (!hasImageData) {
          console.log("No image data found - editor will use placeholder")
        }

        setIsLoading(false)
      } catch (err) {
        setError("Failed to initialize editor environment")
        setIsLoading(false)
      }
    }

    // Small delay to ensure proper mounting
    setTimeout(checkEnvironment, 300)

    return () => clearTimeout(timer)
  }, [])

  const handleBack = () => {
    // Navigate back to generator or previous page
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back()
      } else {
        window.location.href = '/generate'
      }
    }
  }

  // Don't render anything until client-side hydration is complete
  if (!isClient) {
    return null;
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-black p-6">
        <div className="max-w-2xl mx-auto bg-gray-900 p-8 rounded-lg border-4 border-red-500 text-center relative overflow-hidden">
          {/* Retro scanlines effect */}
          <div className="absolute inset-0 pointer-events-none opacity-10">
            <div
              className="h-full w-full"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, #ff0000 2px, #ff0000 4px)",
              }}
            />
          </div>
          
          <div className="relative z-10">
            <div className="bg-gradient-to-r from-red-500 via-pink-500 to-red-400 p-1 rounded-lg mb-6 inline-block animate-pulse">
              <div className="bg-black px-4 py-2 rounded-md">
                <h1 className="text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-pink-400 to-red-300 uppercase tracking-wider">
                  ⚠️ SYSTEM ERROR ⚠️
                </h1>
              </div>
            </div>
            
            <div className="mb-6">
              <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4 animate-pulse" />
              <p className="text-red-300 font-mono text-lg mb-2 uppercase tracking-wide">EDITOR INITIALIZATION FAILED</p>
              <p className="text-gray-300 font-mono text-sm">{error}</p>
            </div>
            
            <Button 
              onClick={handleBack} 
              className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-mono uppercase tracking-wide border-2 border-red-400/50 hover:scale-105 transition-transform"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              RETURN TO GENERATOR
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-black flex items-center justify-center">
        <div className="text-center relative">
          {/* Animated background elements - only render on client */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" suppressHydrationWarning>
            {isClient && animatedElements.map((element) => (
              <div
                key={element.id}
                className="absolute w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse opacity-30"
                style={{
                  left: `${element.left}%`,
                  top: `${element.top}%`,
                  animationDelay: `${element.animationDelay}s`,
                  animationDuration: `${element.animationDuration}s`,
                }}
              />
            ))}
          </div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 p-1 rounded-lg mb-4 animate-pulse">
              <div className="bg-black px-6 py-3 rounded-md">
                <div className="text-purple-400 font-mono text-xl font-bold uppercase tracking-wider mb-2">
                  🎨 INITIALIZING EDITOR 🎨
                </div>
              </div>
            </div>
            
            <div className="text-cyan-400 font-mono text-sm animate-pulse flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              LOADING AI INPAINT STUDIO...
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-black">
      <AIImageEditor onBack={handleBack} />
    </div>
  )
}
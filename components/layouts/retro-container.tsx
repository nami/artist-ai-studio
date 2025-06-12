"use client"

import type React from "react"

import { Scanlines } from "@/components/ui/scanlines"
import { FloatingParticles } from "@/components/ui/floating-particles"

interface RetroContainerProps {
  children: React.ReactNode
  className?: string
}

export function RetroContainer({ children, className = "" }: RetroContainerProps) {
  return (
    <div className={`w-full min-h-screen bg-black p-2 sm:p-4 lg:p-6 ${className}`}>
      {/* Main Container */}
      <div className="bg-gray-900 p-4 sm:p-6 lg:p-8 rounded-lg border-4 border-gray-700 shadow-2xl relative overflow-hidden">
        <Scanlines />
        <FloatingParticles />
        {children}
      </div>
    </div>
  )
}

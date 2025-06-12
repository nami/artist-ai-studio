"use client"

import { Grid } from "lucide-react"

export function GalleryEmptyState() {
  return (
    <div className="text-center py-16">
      <div className="text-gray-500 font-mono relative">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-cyan-500/10 rounded-lg animate-pulse"></div>
        <div className="relative z-10 p-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Grid className="w-20 h-20 opacity-50 animate-bounce" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-spin">
                <span className="text-black text-xs font-bold">!</span>
              </div>
            </div>
          </div>
          <div className="text-2xl uppercase mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-bold">
            VAULT IS EMPTY!
          </div>
          <div className="text-lg mb-4 text-cyan-400">Time to create some digital masterpieces!</div>
          <div className="text-sm text-gray-400">Generate amazing art and save your favorites here</div>
          <div className="mt-6 flex justify-center gap-2">
            {["🎨", "✨", "🚀", "💫", "🎮"].map((emoji, i) => (
              <span key={i} className="text-2xl animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}>
                {emoji}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

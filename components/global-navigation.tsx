"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Upload, Zap, GalleryThumbnailsIcon as Gallery, Home, Menu, X, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSound } from "@/contexts/sound-context"

const navigation = [
  { name: "Training", href: "/training", icon: Upload },
  { name: "Generate", href: "/generate", icon: Zap },
  { name: "Gallery", href: "/gallery", icon: Gallery },
]

export function GlobalNavigation() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { playSound, isMuted, toggleMute, initialize } = useSound()
  const [isHovering, setIsHovering] = useState<string | null>(null)

  const handleSoundToggle = () => {
    initialize()
    playSound("click")
    toggleMute()
  }

  const handleNavClick = (href: string) => {
    playSound("click")
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:block fixed top-0 left-0 right-0 z-50 bg-black">
        {/* Scanlines effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-15">
          <div className="scanlines h-full w-full"></div>
        </div>

        {/* Top border - pixelated */}
        <div className="h-1 w-full bg-gradient-to-r from-purple-600 via-cyan-500 to-pink-500"></div>

        <div className="w-full mx-auto px-6 py-2 relative">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <Link
                href="/"
                onClick={() => handleNavClick("/")}
                onMouseEnter={() => playSound("hover")}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-cyan-400 to-pink-500 blur-[1px]"></div>
                <div className="relative bg-gradient-to-r from-purple-500 via-cyan-400 to-pink-500 p-0.5 rounded-sm">
                  <div className="bg-black px-3 py-1 rounded-sm">
                    <h1 className="text-sm font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-300 to-pink-400 uppercase tracking-wider">
                      🎮 ARTIST AI STUDIO
                    </h1>
                  </div>
                </div>
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center space-x-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                const isHovered = isHovering === item.href

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => handleNavClick(item.href)}
                    onMouseEnter={() => {
                      setIsHovering(item.href)
                      playSound("hover")
                    }}
                    onMouseLeave={() => setIsHovering(null)}
                    className={cn(
                      "relative group flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-all duration-150",
                      isActive ? "text-white" : "text-gray-400 hover:text-white",
                    )}
                  >
                    {/* Button background with pixelated border */}
                    <div
                      className={cn(
                        "absolute inset-0 transition-all duration-150",
                        isActive || isHovered
                          ? "bg-gradient-to-b from-gray-700 to-gray-900 border-t-2 border-l border-r border-b-2 border-t-cyan-400 border-l-purple-500 border-r-pink-500 border-b-gray-800"
                          : "opacity-0 group-hover:opacity-100 bg-gray-800/50",
                      )}
                    ></div>

                    {/* Icon and text */}
                    <div className="relative flex items-center gap-1.5">
                      <item.icon
                        className={cn(
                          "w-3.5 h-3.5 transition-all",
                          isActive ? "text-cyan-400" : "text-gray-400 group-hover:text-cyan-400",
                        )}
                      />
                      <span
                        className={cn(
                          "transition-all",
                          isActive ? "text-white" : "text-gray-400 group-hover:text-white",
                        )}
                      >
                        {item.name}
                      </span>
                    </div>

                    {/* Active indicator - pixelated bottom highlight */}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-cyan-400 to-pink-500"></div>
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Sound Toggle - Retro style */}
            <button
              onClick={handleSoundToggle}
              onMouseEnter={() => playSound("hover")}
              className={cn("relative group flex items-center justify-center w-8 h-8 transition-all duration-150")}
              aria-label={isMuted ? "Unmute sound effects" : "Mute sound effects"}
            >
              {/* Button background with pixelated border */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-900 border-t-2 border-l border-r border-b-2",
                  isMuted
                    ? "border-t-gray-600 border-l-gray-600 border-r-gray-600 border-b-gray-800"
                    : "border-t-cyan-400 border-l-cyan-500 border-r-cyan-500 border-b-gray-800",
                )}
              ></div>

              {/* Icon */}
              <div className="relative">
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-gray-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Bottom border - pixelated */}
        <div className="h-1 w-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800"></div>
      </nav>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-black">
          {/* Scanlines effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-15">
            <div className="scanlines h-full w-full"></div>
          </div>

          {/* Top border - pixelated */}
          <div className="h-1 w-full bg-gradient-to-r from-purple-600 via-cyan-500 to-pink-500"></div>

          <div className="flex items-center justify-between px-3 py-2 relative">
            {/* Mobile Menu Button - Retro style */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(!isMobileMenuOpen)
                playSound("click")
              }}
              className="relative w-8 h-8 flex items-center justify-center"
            >
              {/* Button background with pixelated border */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-900 border-t-2 border-l border-r border-b-2",
                  isMobileMenuOpen
                    ? "border-t-cyan-400 border-l-cyan-500 border-r-cyan-500 border-b-gray-800"
                    : "border-t-gray-600 border-l-gray-600 border-r-gray-600 border-b-gray-800",
                )}
              ></div>

              {/* Icon */}
              <div className="relative">
                {isMobileMenuOpen ? (
                  <X className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Menu className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </button>

            {/* Mobile Logo */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-cyan-400 to-pink-500 blur-[1px]"></div>
              <div className="relative bg-gradient-to-r from-purple-500 via-cyan-400 to-pink-500 p-0.5 rounded-sm">
                <div className="bg-black px-2 py-1 rounded-sm">
                  <h1 className="text-xs font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-300 to-pink-400 uppercase tracking-wider">
                    🎮 ARTIST AI STUDIO
                  </h1>
                </div>
              </div>
            </div>

            {/* Mobile Sound Toggle - Retro style */}
            <button
              onClick={handleSoundToggle}
              className="relative w-8 h-8 flex items-center justify-center"
              aria-label={isMuted ? "Unmute sound effects" : "Mute sound effects"}
            >
              {/* Button background with pixelated border */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-900 border-t-2 border-l border-r border-b-2",
                  isMuted
                    ? "border-t-gray-600 border-l-gray-600 border-r-gray-600 border-b-gray-800"
                    : "border-t-cyan-400 border-l-cyan-500 border-r-cyan-500 border-b-gray-800",
                )}
              ></div>

              {/* Icon */}
              <div className="relative">
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-gray-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                )}
              </div>
            </button>
          </div>

          {/* Bottom border - pixelated */}
          <div className="h-1 w-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800"></div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-70 z-40" onClick={() => setIsMobileMenuOpen(false)} />
        )}

        {/* Mobile Menu - Retro style */}
        <div
          className={cn(
            "fixed top-0 left-0 h-full w-64 bg-black transform transition-transform duration-300 z-50",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* Scanlines effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-15">
            <div className="scanlines h-full w-full"></div>
          </div>

          {/* Right border - pixelated */}
          <div className="absolute top-0 right-0 bottom-0 w-1 bg-gradient-to-b from-purple-600 via-cyan-500 to-pink-500"></div>

          <div className="pt-16 p-4">
            {/* Mobile Navigation Links */}
            <div className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => handleNavClick(item.href)}
                    className="relative block"
                  >
                    {/* Button background with pixelated border */}
                    <div
                      className={cn(
                        "absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-900 border-t-2 border-l border-r border-b-2",
                        isActive
                          ? "border-t-cyan-400 border-l-purple-500 border-r-pink-500 border-b-gray-800"
                          : "border-t-gray-600 border-l-gray-600 border-r-gray-600 border-b-gray-800",
                      )}
                    ></div>

                    {/* Content */}
                    <div className="relative flex items-center gap-3 px-4 py-2.5">
                      <item.icon className={cn("w-4 h-4", isActive ? "text-cyan-400" : "text-gray-400")} />
                      <span
                        className={cn(
                          "font-mono text-sm uppercase tracking-wide",
                          isActive ? "text-white" : "text-gray-400",
                        )}
                      >
                        {item.name}
                      </span>
                    </div>

                    {/* Active indicator - pixelated left highlight */}
                    {isActive && (
                      <div className="absolute top-2 bottom-2 left-0 w-0.5 bg-gradient-to-b from-purple-500 via-cyan-400 to-pink-500"></div>
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Mobile Sound Status - Retro style */}
            <div className="mt-6 relative">
              {/* Background with pixelated border */}
              <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900 border-t border-l border-r border-b border-gray-700"></div>

              {/* Content */}
              <div className="relative flex items-center justify-between p-3">
                <span className="text-gray-400 font-mono text-xs uppercase tracking-wide">Sound Effects</span>
                <span
                  className={cn(
                    "font-mono text-xs uppercase tracking-wide px-2 py-0.5",
                    isMuted
                      ? "bg-red-900/30 text-red-400 border border-red-800"
                      : "bg-green-900/30 text-green-400 border border-green-800",
                  )}
                >
                  {isMuted ? "OFF" : "ON"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for fixed navigation - NO WHITE SPACE */}
      <div className="h-12 lg:h-14" />

      {/* CSS for scanlines */}
      <style jsx global>{`
        .scanlines {
          background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0) 50%,
            rgba(0, 0, 0, 0.2) 50%
          );
          background-size: 100% 4px;
          animation: scanlines 0.2s linear infinite;
        }
        
        @keyframes scanlines {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 4px;
          }
        }
      `}</style>
    </>
  )
}

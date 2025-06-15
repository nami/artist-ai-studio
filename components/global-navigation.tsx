"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Upload, Zap, GalleryThumbnailsIcon as Gallery, Menu, X, Volume2, VolumeX, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSound } from "@/contexts/sound-context"
import { AuthModals } from "./auth/auth-modals"
import { useAuth } from "@/hooks/use-auth"

const navigation = [
  { name: "Training", href: "/training", icon: Upload, protected: true },
  { name: "Generate", href: "/generate", icon: Zap, protected: true },
  { name: "Gallery", href: "/gallery", icon: Gallery, protected: true },
]

export function GlobalNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { playSound, isMuted, toggleMute, initialize } = useSound()
  const [isHovering, setIsHovering] = useState<string | null>(null)
  const { user, signOut, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  // Fix hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSoundToggle = () => {
    initialize()
    playSound("click")
    toggleMute()
  }

  const handleNavClick = (href: string) => {
    playSound("click")
    setIsMobileMenuOpen(false)
  }

  const handleSignOut = async () => {
    try {
      playSound("click")
      await signOut()
      
      // Force redirect to home page after sign out
      router.push('/')
      router.refresh() // Force a hard refresh to clear any cached state
      
      // Close mobile menu if open
      setIsMobileMenuOpen(false)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Filter navigation items based on auth state (only show protected routes if user is authenticated)
  const filteredNavigation = navigation.filter(item => !item.protected || (user && !loading))

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="bg-black/80 backdrop-blur-sm border-b border-gray-800">
          <div className="px-4">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center">
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
              </Link>

              {/* Placeholder for navigation items */}
              <div className="hidden md:flex items-center space-x-4">
                {/* Placeholder space */}
              </div>

              {/* Right side placeholder */}
              <div className="flex items-center space-x-4">
                <div className="w-32 h-8 bg-transparent"></div>
                <button className="md:hidden p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                  <Menu className="w-5 h-5 text-gray-400" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-black/80 backdrop-blur-sm border-b border-gray-800">
        <div className="px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center" onClick={() => playSound("click")}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-cyan-400 to-pink-500 blur-[1px]"></div>
                <div className="relative bg-gradient-to-r from-purple-500 via-cyan-400 to-pink-500 p-0.5 rounded-sm">
                  <div className="bg-black px-2 py-1 rounded-sm flex items-center gap-2">
                    <img 
                      src="/pixel-cat-icon.png" 
                      alt="Pixel Cat" 
                      className="w-6 h-6 object-contain"
                    />
                    <h1 className="text-xs font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-300 to-pink-400 uppercase tracking-wider">
                      ARTIST AI STUDIO
                    </h1>
                  </div>
                </div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => handleNavClick(item.href)}
                    className={cn(
                      "relative group flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-all duration-150",
                      isActive ? "text-white" : "text-gray-400 hover:text-white",
                      "focus:outline-none"
                    )}
                    onMouseEnter={() => {
                      playSound("hover")
                      setIsHovering(item.name)
                    }}
                    onMouseLeave={() => setIsHovering(null)}
                  >
                    <span className="absolute inset-0 transition-all duration-150 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-gray-700 to-gray-900 border-t-2 border-l border-r border-b-2 border-t-cyan-400 border-l-purple-500 border-r-pink-500 border-b-gray-800 rounded-md"></span>
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

                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-cyan-400 to-pink-500"></div>
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Right side items */}
            <div className="flex items-center space-x-4">
              {/* Conditional Auth Display */}
              {loading ? (
                // Show loading state
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-8 bg-gray-800 animate-pulse rounded"></div>
                </div>
              ) : user ? (
                // Show Sign Out when logged in
                <div className="flex items-center space-x-4">
                  <span className="text-gray-400 font-mono text-xs truncate max-w-32">
                    {user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className={cn(
                      "relative group flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-all duration-150",
                      "text-gray-400 hover:text-white",
                      "focus:outline-none"
                    )}
                    onMouseEnter={() => playSound('hover')}
                  >
                    <span className="absolute inset-0 transition-all duration-150 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-gray-700 to-gray-900 border-t-2 border-l border-r border-b-2 border-t-cyan-400 border-l-purple-500 border-r-pink-500 border-b-gray-800 rounded-md"></span>
                    <span className="relative flex items-center gap-1.5">
                      <LogOut className="w-3.5 h-3.5 text-gray-400 group-hover:text-cyan-400" />
                      <span className="text-gray-400 group-hover:text-white">Sign Out</span>
                    </span>
                  </button>
                </div>
              ) : (
                // Show Auth Modals when not logged in
                <AuthModals />
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(!isMobileMenuOpen)
                  playSound("click")
                }}
                className="md:hidden p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                onMouseEnter={() => playSound("hover")}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-gray-400" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Sound Toggle */}
              <button
                onClick={handleSoundToggle}
                className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                onMouseEnter={() => playSound("hover")}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-gray-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-sm border-b border-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium",
                    isActive
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  )}
                  onMouseEnter={() => playSound("hover")}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              )
            })}
            
            {/* Mobile Sign Out */}
            {!loading && user && (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:bg-gray-800 hover:text-white w-full text-left"
                onMouseEnter={() => playSound("hover")}
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
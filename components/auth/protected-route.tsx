"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { AuthModals } from "./auth-modals"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-t-transparent border-cyan-400 rounded-full animate-spin mx-auto"></div>
          <div className="text-cyan-400 font-mono text-xl uppercase tracking-wide">LOADING</div>
        </div>
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-t-transparent border-cyan-400 rounded-full animate-spin mx-auto"></div>
          <div className="text-cyan-400 font-mono text-xl uppercase tracking-wide">LOADING</div>
        </div>
      </div>
    )
  }

  // Show retro access denied screen if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-2xl">
          {/* Retro Terminal Box */}
          <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 border-4 border-cyan-400 rounded-lg p-8 shadow-2xl">
            {/* Terminal Header */}
            <div className="absolute top-0 left-0 right-0 bg-cyan-400 h-8 rounded-t flex items-center px-4">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex-1 text-center">
                <span className="text-black font-mono text-sm font-bold">ARTIST-AI-STUDIO.EXE</span>
              </div>
            </div>

            {/* Content */}
            <div className="mt-8 space-y-6">
              {/* ASCII Art Style Title */}
              <div className="text-red-400 font-mono text-sm leading-tight">
                <pre className="whitespace-pre text-xs sm:text-sm">{`
 █████╗  ██████╗██████╗███████╗███████╗███████╗
██╔══██╗██╔════╝██╔══██╝██╔════╝██╔════╝██╔════╝
███████║██║     ██║  ██║█████╗  █████╗  ███████╗
██╔══██║██║     ██║  ██║██╔══╝  ██╔══╝  ╚════██║
██║  ██║╚██████╗██████╔╝███████╗███████╗███████║
╚═╝  ╚═╝ ╚═════╝╚═════╝ ╚══════╝╚══════╝╚══════╝
                                                
             ██████╗ ███████╗███╗   ██╗██╗███████╗██████╗ 
             ██╔══██╗██╔════╝████╗  ██║██║██╔════╝██╔══██╗
             ██║  ██║█████╗  ██╔██╗ ██║██║█████╗  ██║  ██║
             ██║  ██║██╔══╝  ██║╚██╗██║██║██╔══╝  ██║  ██║
             ██████╔╝███████╗██║ ╚████║██║███████╗██████╔╝ 
             ╚═════╝ ╚══════╝╚═╝  ╚═══╝╚═╝╚══════╝╚═════╝  
`}</pre>
              </div>

              {/* Error Message */}
              <div className="space-y-4">
                <div className="text-red-400 font-mono text-xl uppercase tracking-wider animate-pulse">
                  🚫 UNAUTHORIZED ACCESS 🚫
                </div>
                
                <div className="text-gray-300 font-mono text-sm space-y-2">
                  <p>ERROR CODE: 401 - AUTHENTICATION REQUIRED</p>
                  <p>SYSTEM MESSAGE: LOGIN CREDENTIALS NOT FOUND</p>
                  <p>STATUS: ACCESS TO PROTECTED AREA DENIED</p>
                </div>

                <div className="text-cyan-400 font-mono text-base">
                  &gt; YOU MUST SIGN IN TO ACCESS THIS FEATURE
                </div>
              </div>

              {/* Auth Buttons */}
              <div className="space-y-4">
                <div className="text-yellow-400 font-mono text-sm">
                  SELECT AN OPTION TO CONTINUE:
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <AuthModals 
                    buttonClassName="group relative bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-sm font-bold px-6 py-3 rounded-lg uppercase tracking-wider transition-all duration-200 border-2 border-cyan-300 hover:border-cyan-200 shadow-lg hover:shadow-cyan-400/25"
                    textClassName="text-black group-hover:text-black"
                    iconClassName="w-4 h-4 text-black group-hover:text-black"
                  />
                </div>
              </div>

              {/* Retro Footer */}
              <div className="text-gray-500 font-mono text-xs mt-8 border-t border-gray-700 pt-4">
                <p>ARTIST AI STUDIO v1.0 © 2025</p>
                <p>PRESS ANY KEY TO CONTINUE... JUST KIDDING, USE THE BUTTONS ABOVE 😄</p>
              </div>
            </div>

            {/* Decorative Corner Elements */}
            <div className="absolute top-4 right-4 text-cyan-400 font-mono text-xs">
              [SECURE TERMINAL]
            </div>
            <div className="absolute bottom-4 left-4 text-green-400 font-mono text-xs animate-pulse">
              ● ONLINE
            </div>
          </div>

          {/* Retro Scanlines Effect */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="h-full w-full bg-gradient-to-b from-transparent via-cyan-400 to-transparent bg-repeat-y animate-pulse" 
                 style={{ 
                   backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6, 182, 212, 0.1) 2px, rgba(6, 182, 212, 0.1) 4px)',
                   animationDuration: '2s'
                 }}>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // User is authenticated, show protected content
  return <>{children}</>
}
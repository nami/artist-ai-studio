"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Upload, Zap, GalleryThumbnailsIcon, ChevronRight, Sparkles, Star } from 'lucide-react'
import { useSound } from "@/contexts/sound-context"

export default function LandingPage() {
  const router = useRouter()
  const { play, initialize } = useSound()
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    initialize()
    const timer = setTimeout(() => setIsLoaded(true), 500)
    return () => clearTimeout(timer)
  }, [initialize])

  const handleNavigation = (path: string) => {
    play("click")
    router.push(path)
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
  }

  return (
    <div className="h-screen bg-black text-white relative overflow-hidden flex flex-col">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ff00ff10 1px, transparent 1px), linear-gradient(to bottom, #00ffff10 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Scanlines */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-10">
        <div className="scanlines h-full w-full"></div>
      </div>

      {/* Main Content Container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative z-10 flex-1 flex flex-col justify-center max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4"
      >
        <motion.div
          variants={container}
          initial="hidden"
          animate={isLoaded ? "show" : "hidden"}
          className="text-center"
        >
          {/* Logo */}
          <motion.div variants={item} className="mb-6 relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-cyan-400 to-pink-500 blur-lg opacity-70 rounded-xl"></div>
            <div className="relative bg-gradient-to-r from-purple-500 via-cyan-400 to-pink-500 p-1 rounded-xl">
              <div className="bg-black px-6 py-3 rounded-lg">
                <motion.h1
                  animate={{
                    textShadow: [
                      "0 0 5px #fff, 0 0 10px #fff, 0 0 15px #0ff, 0 0 20px #0ff, 0 0 25px #0ff, 0 0 30px #0ff, 0 0 35px #0ff",
                      "0 0 5px #fff, 0 0 10px #fff, 0 0 15px #f0f, 0 0 20px #f0f, 0 0 25px #f0f, 0 0 30px #f0f, 0 0 35px #f0f",
                      "0 0 5px #fff, 0 0 10px #fff, 0 0 15px #ff0, 0 0 20px #ff0, 0 0 25px #ff0, 0 0 30px #ff0, 0 0 35px #ff0",
                      "0 0 5px #fff, 0 0 10px #fff, 0 0 15px #0ff, 0 0 20px #0ff, 0 0 25px #0ff, 0 0 30px #0ff, 0 0 35px #0ff",
                    ],
                    transition: {
                      duration: 8,
                      repeat: Infinity,
                      repeatType: "reverse" as const,
                    },
                  }}
                  className="text-3xl md:text-5xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-300 to-pink-400 uppercase tracking-wider"
                >
                  ARTIST AI STUDIO
                </motion.h1>
                <motion.p
                  variants={item}
                  className="mt-1 text-xs md:text-sm font-mono text-gray-400 uppercase tracking-widest"
                >
                  Create • Train • Generate
                </motion.p>
              </div>
            </div>
          </motion.div>

          {/* Tagline */}
          <motion.h2 variants={item} className="text-lg md:text-xl font-mono mb-6 text-cyan-300 tracking-wide">
            Transform your images into AI-powered creations
          </motion.h2>

          {/* CTA Button */}
          <motion.div variants={item} className="mb-8">
            <button
              onClick={() => handleNavigation("/training")}
              className="group relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 rounded-lg font-mono text-base uppercase tracking-wider overflow-hidden transition-all duration-300 hover:scale-105"
              onMouseEnter={() => play("hover")}
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Training <ChevronRight className="w-4 h-4" />
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </button>
          </motion.div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate={isLoaded ? "show" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
        >
          {/* Training Card */}
          <Link
            href="/training"
            onClick={() => play("click")}
            className="block"
          >
            <motion.div
              variants={item}
              whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
              className="group relative"
              onMouseEnter={() => play("hover")}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl blur-sm opacity-70"></div>
              <div className="relative border-2 border-pink-500/50 bg-gray-900/90 rounded-lg p-4 h-full flex flex-col">
                <div className="bg-pink-500/20 rounded-full p-2 w-10 h-10 flex items-center justify-center mb-3">
                  <Upload className="w-5 h-5 text-pink-400" />
                </div>
                <h3 className="text-lg font-mono font-bold text-pink-400 mb-2">Training</h3>
                <p className="text-gray-400 text-sm mb-3 flex-grow">
                  Upload your images and train the AI to understand your style.
                </p>
                <div className="inline-flex items-center font-mono text-xs text-pink-400 group-hover:text-white transition-colors">
                  Start Training <ChevronRight className="w-3 h-3 ml-1" />
                </div>
              </div>
            </motion.div>
          </Link>

          {/* Generate Card */}
          <Link
            href="/generate"
            onClick={() => play("click")}
            className="block"
          >
            <motion.div
              variants={item}
              whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
              className="group relative"
              onMouseEnter={() => play("hover")}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl blur-sm opacity-70"></div>
              <div className="relative border-2 border-cyan-500/50 bg-gray-900/90 rounded-lg p-4 h-full flex flex-col">
                <div className="bg-cyan-500/20 rounded-full p-2 w-10 h-10 flex items-center justify-center mb-3">
                  <Zap className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-mono font-bold text-cyan-400 mb-2">Generate</h3>
                <p className="text-gray-400 text-sm mb-3 flex-grow">
                  Create amazing AI-generated images based on your training data.
                </p>
                <div className="inline-flex items-center font-mono text-xs text-cyan-400 group-hover:text-white transition-colors">
                  Generate Images <ChevronRight className="w-3 h-3 ml-1" />
                </div>
              </div>
            </motion.div>
          </Link>

          {/* Gallery Card */}
          <Link
            href="/gallery"
            onClick={() => play("click")}
            className="block"
          >
            <motion.div
              variants={item}
              whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
              className="group relative"
              onMouseEnter={() => play("hover")}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl blur-sm opacity-70"></div>
              <div className="relative border-2 border-purple-500/50 bg-gray-900/90 rounded-lg p-4 h-full flex flex-col">
                <div className="bg-purple-500/20 rounded-full p-2 w-10 h-10 flex items-center justify-center mb-3">
                  <GalleryThumbnailsIcon className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-mono font-bold text-purple-400 mb-2">Gallery</h3>
                <p className="text-gray-400 text-sm mb-3 flex-grow">
                  Browse and manage your collection of AI-generated masterpieces.
                </p>
                <div className="inline-flex items-center font-mono text-xs text-purple-400 group-hover:text-white transition-colors">
                  View Gallery <ChevronRight className="w-3 h-3 ml-1" />
                </div>
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="mt-6 text-center"
        >
          <p className="text-gray-500 font-mono text-xs">
            <span className="inline-flex items-center">
              <Sparkles className="w-3 h-3 mr-1 text-cyan-400" /> Powered by AI Studio
            </span>
          </p>
        </motion.div>
      </motion.div>

      {/* Floating Stars */}
      <div className="absolute top-16 left-10 animate-float-slow opacity-30">
        <Star className="w-4 h-4 text-pink-400 fill-pink-400" />
      </div>
      <div className="absolute top-32 right-16 animate-float-medium opacity-40">
        <Star className="w-3 h-3 text-cyan-400 fill-cyan-400" />
      </div>
      <div className="absolute bottom-32 left-20 animate-float-fast opacity-35">
        <Star className="w-5 h-5 text-purple-400 fill-purple-400" />
      </div>
      <div className="absolute top-24 left-1/3 animate-float-slow opacity-25">
        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
      </div>
      <div className="absolute bottom-40 right-1/4 animate-float-medium opacity-30">
        <Star className="w-4 h-4 text-pink-400 fill-pink-400" />
      </div>
      <div className="absolute top-40 right-1/3 animate-float-fast opacity-35">
        <Star className="w-3 h-3 text-cyan-400 fill-cyan-400" />
      </div>

      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(180deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(180deg); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(180deg); }
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-medium 6s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: float-fast 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

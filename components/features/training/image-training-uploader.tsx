"use client"

import type React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import { Upload, X, ImageIcon, AlertTriangle, Star, Zap } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useSound } from "@/contexts/sound-context"
import { ImageModal } from "@/components/image-modal"
import { useRouter } from "next/navigation"
import { TrainingDashboard } from "@/components/training-dashboard"
import { useSoundEffects } from "@/hooks/use-sound-effects"

interface FileWithPreview extends File {
  id: string
  preview: string
  progress: number
  status: "uploading" | "completed" | "error"
}

interface UploadedImage {
  id: string
  preview: string
  name: string
}

export default function ImageTrainingUploader() {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [validationMessage, setValidationMessage] = useState<string>("")
  const [score, setScore] = useState(0)
  const [previousLevel, setPreviousLevel] = useState(1)
  const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isTrainingOpen, setIsTrainingOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { play, isMuted, initialize } = useSound()
  const router = useRouter()
  const [images, setImages] = useState<UploadedImage[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  
  // Keep track of active upload intervals for cleanup
  const activeIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Initialize sound system on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      initialize()
      document.removeEventListener("click", handleFirstInteraction)
    }

    document.addEventListener("click", handleFirstInteraction)

    return () => {
      document.removeEventListener("click", handleFirstInteraction)
    }
  }, [initialize])

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      // Clear all active intervals when component unmounts
      activeIntervalsRef.current.forEach((interval) => {
        clearInterval(interval)
      })
      activeIntervalsRef.current.clear()
    }
  }, [])

  const validateFiles = (newFiles: FileWithPreview[]) => {
    const totalFiles = files.length + newFiles.length

    // Always allow uploads, but show validation messages
    if (totalFiles < 10) {
      setValidationMessage(`NEED ${10 - totalFiles} MORE IMAGES • MIN: 10 REQUIRED`)
      // Don't play error sound for individual uploads, just show the message
      return true // Allow the upload
    }

    if (totalFiles > 50) {
      setValidationMessage(`TOO MANY FILES! • MAX: 50 ALLOWED • CURRENT: ${totalFiles}`)
      play("error")
      return false // Block uploads over 50
    }

    setValidationMessage("")
    return true
  }

  const processFiles = (fileList: FileList) => {
    const validImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]

    const newFiles: FileWithPreview[] = Array.from(fileList)
      .filter((file) => validImageTypes.includes(file.type))
      .map((file) => ({
        ...file,
        id: Math.random().toString(36).substr(2, 9),
        preview: URL.createObjectURL(file),
        progress: 0,
        status: "uploading" as const,
      }))

    // Check if we would exceed the maximum
    if (files.length + newFiles.length > 50) {
      setValidationMessage(`TOO MANY FILES! • MAX: 50 ALLOWED • WOULD BE: ${files.length + newFiles.length}`)
      play("error")
      return
    }

    // Add the files
    setFiles((prev) => [...prev, ...newFiles])
    setScore((prev) => prev + newFiles.length * 100)
    play("drop")

    // Update validation message after adding files
    const totalAfterUpload = files.length + newFiles.length
    if (totalAfterUpload < 10) {
      setValidationMessage(`NEED ${10 - totalAfterUpload} MORE IMAGES • MIN: 10 REQUIRED`)
    } else {
      setValidationMessage("")
    }

    newFiles.forEach((file) => {
      simulateUpload(file.id)
    })
  }

  const simulateUpload = (fileId: string) => {
    let progressSound = 0
    let currentProgress = 0
    let iterationCount = 0
    const maxIterations = 20 // Ensure upload completes within reasonable time
    
    const interval = setInterval(() => {
      iterationCount++
      
      setFiles((prev) =>
        prev.map((file) => {
          if (file.id === fileId) {
            // Calculate new progress with guaranteed completion
            let newProgress: number
            
            if (iterationCount >= maxIterations) {
              // Force completion after max iterations
              newProgress = 100
            } else if (currentProgress >= 95) {
              // When near completion, add smaller increments to reach 100
              const remaining = 100 - currentProgress
              newProgress = currentProgress + Math.min(remaining, Math.random() * 5 + 1)
            } else {
              // Normal progress with larger increments
              newProgress = currentProgress + Math.random() * 8 + 2
            }
            
            // Ensure we don't exceed 100 and round to avoid floating point issues
            newProgress = Math.min(Math.round(newProgress * 10) / 10, 100)
            currentProgress = newProgress
            
            const status = newProgress >= 100 ? "completed" : "uploading"

            // Play upload sound at certain progress points
            if (Math.floor(newProgress / 25) > Math.floor(progressSound / 25)) {
              play("upload")
              progressSound = newProgress
            }

            if (newProgress >= 100) {
              // Clear the interval and remove from active intervals
              clearInterval(interval)
              activeIntervalsRef.current.delete(fileId)
              
              setScore((prevScore) => prevScore + 50)
              play("complete")
              
              // Ensure progress is exactly 100
              newProgress = 100
            }

            return { ...file, progress: newProgress, status }
          }
          return file
        }),
      )
    }, 150) // Slightly faster interval for better UX
    
    // Store the interval reference for cleanup
    activeIntervalsRef.current.set(fileId, interval)
  }

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!isDragOver) {
        play("hover")
        setIsDragOver(true)
      }
    },
    [isDragOver, play],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const droppedFiles = e.dataTransfer.files
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles)
      }
    },
    [files],
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles)
    }
  }

  const removeFile = (fileId: string) => {
    play("delete")
    
    // Clear any active upload interval for this file
    const interval = activeIntervalsRef.current.get(fileId)
    if (interval) {
      clearInterval(interval)
      activeIntervalsRef.current.delete(fileId)
    }
    
    setFiles((prev) => {
      const updatedFiles = prev.filter((file) => file.id !== fileId)
      setScore((prevScore) => Math.max(0, prevScore - 150))

      // Always show validation message if under 10 files
      if (updatedFiles.length < 10) {
        setValidationMessage(`NEED ${10 - updatedFiles.length} MORE IMAGES • MIN: 10 REQUIRED`)
      } else {
        setValidationMessage("")
      }

      return updatedFiles
    })
  }

  const replaceFile = (fileId: string, newFile: File) => {
    play("upload")
    
    // Clear any existing upload interval for this file
    const existingInterval = activeIntervalsRef.current.get(fileId)
    if (existingInterval) {
      clearInterval(existingInterval)
      activeIntervalsRef.current.delete(fileId)
    }
    
    setFiles((prev) =>
      prev.map((file) => {
        if (file.id === fileId) {
          // Clean up old preview URL
          URL.revokeObjectURL(file.preview)

          return {
            ...newFile,
            id: fileId, // Keep the same ID
            preview: URL.createObjectURL(newFile),
            progress: 0,
            status: "uploading" as const,
          }
        }
        return file
      }),
    )

    // Start upload simulation for replaced file
    simulateUpload(fileId)
  }

  const openImageModal = (file: FileWithPreview) => {
    play("click")
    setSelectedFile(file)
    setIsModalOpen(true)
  }

  const closeImageModal = () => {
    play("click")
    setIsModalOpen(false)
    setSelectedFile(null)
  }

  const openFileDialog = () => {
    play("click")
    fileInputRef.current?.click()
  }

  const startTraining = () => {
    play("levelUp")

    // Convert files to training images format
    const completedImages = files
      .filter((f) => f.status === "completed")
      .map((f) => ({
        id: f.id,
        preview: f.preview,
        name: f.name,
      }))

    // Show training dashboard directly
    setIsTrainingOpen(true)
  }

  const completedFiles = files.filter((f) => f.status === "completed").length
  const uploadingFiles = files.filter((f) => f.status === "uploading").length
  const level = Math.floor(completedFiles / 5) + 1

  // Check for level up
  useEffect(() => {
    if (level > previousLevel) {
      play("levelUp")
      setPreviousLevel(level)
    }
  }, [level, previousLevel, play])

  // Show training dashboard if training is open
  if (isTrainingOpen) {
    const trainingImages = files
      .filter((f) => f.status === "completed")
      .map((f) => ({
        id: f.id,
        preview: f.preview,
        name: f.name,
      }))
    return (
      <TrainingDashboard 
        onClose={() => setIsTrainingOpen(false)} 
        trainingImages={trainingImages} 
        playSound={(sound: string) => play(sound as any)} 
      />
    )
  }

  return (
    <div className="w-full min-h-screen bg-black">
      {/* Retro CRT Screen Container */}
      <div className="bg-gray-900 p-4 sm:p-6 lg:p-8 rounded-lg border-4 border-gray-700 shadow-2xl relative overflow-hidden max-w-none m-2 sm:m-4 lg:m-6">
        {/* Scanlines Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, #00ff00 2px, #00ff00 4px)",
            }}
          />
        </div>

        {/* Header - Game Console Style */}
        <div className="relative z-10 text-center space-y-4 mb-6 lg:mb-8">
          <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 p-1 rounded-lg inline-block">
            <div className="bg-black px-4 sm:px-6 py-2 sm:py-3 rounded-md">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 uppercase">
                ★ RETRO GALLERY ★
              </h1>
            </div>
          </div>
          <div className="flex justify-center items-center gap-4 text-green-400 font-mono text-sm">
            <span>PLAYER 1</span>
            <span className="animate-pulse">●</span>
            <span>READY</span>
          </div>
        </div>

        {/* Game Stats HUD */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {/* Score */}
          <div className="bg-black border-2 border-yellow-400 p-2 sm:p-3 rounded font-mono">
            <div className="text-yellow-400 text-xs uppercase tracking-wide">Score</div>
            <div className="text-yellow-300 text-lg sm:text-xl font-bold">{score.toLocaleString()}</div>
          </div>

          {/* Level */}
          <div className="bg-black border-2 border-green-400 p-2 sm:p-3 rounded font-mono">
            <div className="text-green-400 text-xs uppercase tracking-wide">Level</div>
            <div className="text-green-300 text-lg sm:text-xl font-bold">{level}</div>
          </div>

          {/* Files */}
          <div className="bg-black border-2 border-pink-400 p-2 sm:p-3 rounded font-mono">
            <div className="text-pink-400 text-xs uppercase tracking-wide">Files</div>
            <div className="text-pink-300 text-lg sm:text-xl font-bold">{files.length}/50</div>
          </div>

          {/* Status */}
          <div className="bg-black border-2 border-cyan-400 p-2 sm:p-3 rounded font-mono">
            <div className="text-cyan-400 text-xs uppercase tracking-wide">Status</div>
            <div className="text-cyan-300 text-lg sm:text-xl font-bold">
              {uploadingFiles > 0 ? "LOADING" : completedFiles >= 10 ? "READY" : "WAITING"}
            </div>
          </div>
        </div>

        {/* Validation Alert - Retro Style */}
        {validationMessage && (
          <div className="mb-6 bg-red-900 border-2 border-red-400 p-3 sm:p-4 rounded font-mono">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400 animate-pulse flex-shrink-0" />
              <span className="text-red-300 text-xs sm:text-sm uppercase tracking-wide">{validationMessage}</span>
            </div>
          </div>
        )}

        {/* Drag and Drop Area - Arcade Style */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-4 border-dashed rounded-lg p-6 sm:p-8 text-center transition-all duration-300 cursor-pointer font-mono mb-6
            ${
              isDragOver
                ? "border-pink-400 bg-pink-900/20 shadow-lg shadow-pink-500/25 animate-pulse"
                : "border-gray-600 hover:border-purple-400 hover:bg-purple-900/10 hover:shadow-lg hover:shadow-purple-500/25"
            }
          `}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="space-y-4 sm:space-y-6">
            {/* Retro Upload Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 border-4 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    isDragOver ? "border-pink-400 bg-pink-500/20 animate-bounce" : "border-gray-500 bg-gray-800"
                  }`}
                >
                  <Upload className={`w-8 h-8 sm:w-10 sm:h-10 ${isDragOver ? "text-pink-400" : "text-gray-400"}`} />
                </div>
                {/* Pixel corners */}
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-cyan-400"></div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-400"></div>
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-yellow-400"></div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400"></div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-bold text-white uppercase tracking-wider">
                {isDragOver
                  ? ">>> DROP FILES HERE <<<"
                  : files.length === 0
                    ? "INSERT FIRST CARTRIDGE"
                    : "ADD MORE CARTRIDGES"}
              </h3>
              <p className="text-gray-400 uppercase text-xs sm:text-sm tracking-wide">
                DRAG & DROP OR <span className="text-pink-400 animate-pulse">PRESS START</span>
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <div>SUPPORTED: JPG • PNG • GIF • WEBP</div>
                <div>UPLOAD ONE BY ONE OR IN BATCHES</div>
                <div>MINIMUM: 10 FILES • MAXIMUM: 50 FILES</div>
              </div>
            </div>
          </div>
        </div>

        {/* File Grid - Game Inventory Style */}
        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="text-lg font-bold font-mono text-white uppercase tracking-wide flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-cyan-400" />
                INVENTORY [{files.length}]
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  play("click")
                  // Clear all active intervals
                  activeIntervalsRef.current.forEach((interval) => {
                    clearInterval(interval)
                  })
                  activeIntervalsRef.current.clear()
                  setFiles([])
                  setScore(0)
                }}
                className="bg-red-900 border-red-400 text-red-300 hover:bg-red-800 font-mono text-xs uppercase tracking-wide"
              >
                CLEAR ALL
              </Button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-2 sm:gap-3">
              {files.map((file, index) => (
                <div
                  key={file.id}
                  className="relative group bg-gray-800 border-2 border-gray-600 rounded-lg overflow-hidden hover:border-purple-400 transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => play("hover")}
                  onClick={() => openImageModal(file)}
                >
                  {/* Item Slot Number */}
                  <div className="absolute top-1 left-1 bg-black text-yellow-400 text-xs font-mono px-1 rounded z-10">
                    {index + 1}
                  </div>

                  {/* Thumbnail */}
                  <div className="aspect-square relative overflow-hidden">
                    <img
                      src={file.preview || "/placeholder.svg"}
                      alt={file.name || "Uploaded image"}
                      className="w-full h-full object-cover"
                    />

                    {/* Status Icons - Hide on hover */}
                    {file.status === "completed" && (
                      <div className="absolute top-1 right-1 w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded flex items-center justify-center group-hover:opacity-0 transition-opacity duration-200">
                        <Star className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                      </div>
                    )}

                    {file.status === "uploading" && (
                      <div className="absolute top-1 right-1 w-4 h-4 sm:w-5 sm:h-5 bg-yellow-500 rounded flex items-center justify-center animate-spin group-hover:opacity-0 transition-opacity duration-200">
                        <Zap className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                      </div>
                    )}

                    {/* Click to View Overlay with Delete Button */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                      <div className="text-white font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black bg-opacity-75 px-2 py-1 rounded">
                        VIEW
                      </div>
                    </div>

                    {/* Enhanced Delete Button - Always visible on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(file.id)
                      }}
                      className="absolute top-1 right-1 w-5 h-5 sm:w-6 sm:h-6 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 border-2 border-red-400 hover:border-red-300 shadow-lg"
                      title="Delete image"
                    >
                      <X className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                    </button>
                  </div>

                  {/* Progress Bar - Health Bar Style */}
                  {file.status === "uploading" && (
                    <div className="p-1 sm:p-2 bg-black">
                      <div className="w-full bg-gray-700 h-1 sm:h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-center mt-1 text-green-400 font-mono">
                        {Math.round(file.progress)}%
                      </div>
                    </div>
                  )}

                  {/* File Info */}
                  <div className="p-1 sm:p-2 bg-black border-t border-gray-700">
                    <p className="text-xs font-mono text-gray-300 truncate uppercase">
                      {file.name ? file.name.substring(0, 6) + "..." : "UNKNOWN"}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {file.size ? (file.size / 1024 / 1024).toFixed(1) + "MB" : "0MB"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons - Arcade Style */}
        {files.length >= 10 && completedFiles >= 10 && (
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={startTraining}
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-black font-bold font-mono uppercase tracking-wider px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg border-2 border-green-400 shadow-lg shadow-green-500/25"
            >
              ⚡ START TRAINING
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="bg-purple-900 border-2 border-purple-400 text-purple-300 hover:bg-purple-800 font-mono uppercase tracking-wider px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg shadow-lg shadow-purple-500/25"
              onClick={() => play("click")}
            >
              💾 SAVE STATE
            </Button>
          </div>
        )}

        {/* Progress Indicator when under 10 files */}
        {files.length < 10 && (
          <div className="mt-8 text-center">
            <div className="bg-gray-800 border-2 border-gray-600 p-4 rounded-lg font-mono">
              <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">MISSION PROGRESS</div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="text-yellow-400 text-2xl font-bold">{files.length}</div>
                <div className="text-gray-500">/</div>
                <div className="text-green-400 text-2xl font-bold">10</div>
              </div>
              <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-500"
                  style={{ width: `${(files.length / 10) * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 uppercase">
                {files.length === 0 ? "START YOUR MISSION" : `${10 - files.length} MORE TO UNLOCK TRAINING`}
              </div>
            </div>
          </div>
        )}

        {/* Show when you have files but not all completed */}
        {files.length >= 10 && completedFiles < 10 && (
          <div className="mt-8 text-center">
            <div className="bg-yellow-900 border-2 border-yellow-400 p-4 rounded-lg font-mono">
              <div className="text-yellow-400 text-sm uppercase tracking-wide mb-2">UPLOADING IN PROGRESS</div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="text-yellow-400 text-2xl font-bold">{completedFiles}</div>
                <div className="text-gray-500">/</div>
                <div className="text-green-400 text-2xl font-bold">{files.length}</div>
                <div className="text-gray-500 text-sm">COMPLETED</div>
              </div>
              <div className="text-xs text-yellow-300 uppercase animate-pulse">WAIT FOR ALL UPLOADS TO COMPLETE</div>
            </div>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedFile && (
        <ImageModal
          file={selectedFile}
          isOpen={isModalOpen}
          onClose={closeImageModal}
          onDelete={removeFile}
          onReplace={replaceFile}
          playSound={(sound: string) => play(sound as any)}
        />
      )}
    </div>
  )
}
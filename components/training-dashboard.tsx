"use client"
import { useState, useEffect } from "react"
import { ArrowLeft, Pause, Play, Square, Clock, Zap, CheckCircle, AlertCircle, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TrainingStep {
  id: string
  name: string
  status: "pending" | "active" | "completed" | "error"
  progress: number
  estimatedTime?: number
}

interface TrainingDashboardProps {
  onClose: () => void
  trainingImages: Array<{ id: string; preview: string; name?: string }>
  playSound: (sound: string) => void
}

export function TrainingDashboard({ onClose, trainingImages, playSound }: TrainingDashboardProps) {
  const [overallProgress, setOverallProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(1800) // 30 minutes in seconds
  const [trainingStatus, setTrainingStatus] = useState<"training" | "paused" | "completed" | "error" | "cancelled">(
    "training",
  )

  const [steps, setSteps] = useState<TrainingStep[]>([
    { id: "upload", name: "UPLOAD COMPLETE", status: "completed", progress: 100 },
    { id: "processing", name: "PROCESSING IMAGES", status: "active", progress: 0 },
    { id: "training", name: "NEURAL TRAINING", status: "pending", progress: 0 },
    { id: "complete", name: "TRAINING COMPLETE", status: "pending", progress: 0 },
  ])

  // Simulate training progress
  useEffect(() => {
    if (isPaused || trainingStatus !== "training") return

    const interval = setInterval(() => {
      setSteps((prevSteps) => {
        const newSteps = [...prevSteps]
        const activeStepIndex = newSteps.findIndex((step) => step.status === "active")

        if (activeStepIndex !== -1) {
          const activeStep = newSteps[activeStepIndex]
          const increment = Math.random() * 3 + 1

          if (activeStep.progress < 100) {
            activeStep.progress = Math.min(100, activeStep.progress + increment)
          } else {
            // Move to next step
            activeStep.status = "completed"
            if (activeStepIndex < newSteps.length - 1) {
              newSteps[activeStepIndex + 1].status = "active"
              setCurrentStep(activeStepIndex + 1)
              playSound("levelUp")
            } else {
              setTrainingStatus("completed")
              playSound("complete")
            }
          }
        }

        return newSteps
      })

      // Update overall progress
      setOverallProgress((prev) => {
        const newProgress = Math.min(100, prev + Math.random() * 0.5)
        if (newProgress >= 100) {
          setTrainingStatus("completed")
        }
        return newProgress
      })

      // Update time remaining
      setTimeRemaining((prev) => Math.max(0, prev - 1))
    }, 100)

    return () => clearInterval(interval)
  }, [isPaused, trainingStatus, playSound])

  const handlePauseResume = () => {
    setIsPaused(!isPaused)
    playSound("click")
  }

  const handleCancel = () => {
    setTrainingStatus("cancelled")
    playSound("error")
    setTimeout(() => onClose(), 1000)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400 border-green-400"
      case "active":
        return "text-cyan-400 border-cyan-400"
      case "error":
        return "text-red-400 border-red-400"
      default:
        return "text-gray-400 border-gray-600"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />
      case "active":
        return <Zap className="w-4 h-4 animate-pulse" />
      case "error":
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-black overflow-y-auto">
      {/* Main Dashboard Container */}
      <div className="relative w-full min-h-screen p-4">
        {/* Glassmorphism Background */}
        <div className="absolute inset-4 bg-gradient-to-br from-gray-900/80 via-purple-900/40 to-pink-900/40 backdrop-blur-xl border-4 border-gray-700/50 rounded-2xl shadow-2xl">
          {/* Animated Background Particles */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 3}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Scanlines Effect */}
        <div className="absolute inset-4 pointer-events-none opacity-5 rounded-2xl overflow-hidden">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, #00ff00 2px, #00ff00 4px)",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-pink-500 to-cyan-400 p-1 rounded-lg">
                <div className="bg-black px-4 py-2 rounded-md">
                  <h1 className="text-xl md:text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 uppercase tracking-wider">
                    ⚡ NEURAL TRAINING ⚡
                  </h1>
                </div>
              </div>
              <div className="text-green-400 font-mono text-sm animate-pulse">
                {trainingStatus === "training" ? "ACTIVE" : trainingStatus.toUpperCase()}
              </div>
            </div>
            <Button
              onClick={() => {
                playSound("click")
                onClose()
              }}
              className="bg-blue-900/80 border-2 border-blue-400/50 text-blue-300 hover:bg-blue-800/80 font-mono uppercase tracking-wide backdrop-blur-sm flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK TO UPLOADER
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Column - Progress & Controls */}
            <div className="lg:col-span-3 space-y-6">
              {/* Circular Progress */}
              <div className="bg-black/40 backdrop-blur-sm border-2 border-gray-600/50 rounded-xl p-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-32 h-32 md:w-40 md:h-40">
                    {/* Background Circle */}
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-700"
                      />
                      {/* Progress Circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 45}`}
                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - overallProgress / 100)}`}
                        className="text-cyan-400 transition-all duration-500 ease-out"
                        style={{
                          filter: "drop-shadow(0 0 10px currentColor)",
                        }}
                      />
                    </svg>
                    {/* Center Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-4xl font-bold font-mono text-cyan-400 mb-1">
                        {Math.round(overallProgress)}%
                      </div>
                      <div className="text-sm text-gray-400 font-mono uppercase tracking-wide">COMPLETE</div>
                      <div className="text-xs text-yellow-400 font-mono mt-2">ETA: {formatTime(timeRemaining)}</div>
                    </div>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={handlePauseResume}
                    disabled={trainingStatus === "completed" || trainingStatus === "cancelled"}
                    className="bg-yellow-900/80 border-2 border-yellow-400/50 text-yellow-300 hover:bg-yellow-800/80 font-mono uppercase tracking-wide backdrop-blur-sm"
                    size="lg"
                  >
                    {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                    {isPaused ? "RESUME" : "PAUSE"}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={trainingStatus === "completed" || trainingStatus === "cancelled"}
                    className="bg-red-900/80 border-2 border-red-400/50 text-red-300 hover:bg-red-800/80 font-mono uppercase tracking-wide backdrop-blur-sm"
                    size="lg"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    CANCEL
                  </Button>
                </div>
              </div>

              {/* Step Progress */}
              <div className="bg-black/40 backdrop-blur-sm border-2 border-gray-600/50 rounded-xl p-6">
                <h3 className="text-lg font-bold font-mono text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-pink-400" />
                  TRAINING PIPELINE
                </h3>
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-4">
                      {/* Step Icon */}
                      <div
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${getStatusColor(step.status)} backdrop-blur-sm`}
                      >
                        {getStatusIcon(step.status)}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-sm text-white uppercase tracking-wide">{step.name}</span>
                          <span className="font-mono text-xs text-gray-400">{Math.round(step.progress)}%</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-700/50 h-2 rounded-full overflow-hidden backdrop-blur-sm">
                          <div
                            className={`h-full transition-all duration-500 ${
                              step.status === "completed"
                                ? "bg-green-500"
                                : step.status === "active"
                                  ? "bg-gradient-to-r from-cyan-500 to-pink-500"
                                  : "bg-gray-600"
                            }`}
                            style={{
                              width: `${step.progress}%`,
                              filter: step.status === "active" ? "drop-shadow(0 0 8px currentColor)" : "none",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Training Images Preview */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-black/40 backdrop-blur-sm border-2 border-gray-600/50 rounded-xl p-6">
                <h3 className="text-lg font-bold font-mono text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  TRAINING DATA
                </h3>
                <div className="grid grid-cols-4 gap-2 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pr-1">
                  {trainingImages.map((image, index) => (
                    <div
                      key={image.id}
                      className="relative aspect-square bg-gray-800/50 rounded-lg overflow-hidden border border-gray-600/50 backdrop-blur-sm"
                    >
                      <div className="absolute top-0 left-0 bg-black/60 text-xs font-mono text-yellow-400 px-1 z-10">
                        {index + 1}
                      </div>
                      <img
                        src={image.preview || "/placeholder.svg"}
                        alt={image.name || `Training image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Processing Overlay */}
                      {currentStep === 1 && (
                        <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
                          <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {/* Training Overlay */}
                      {currentStep === 2 && (
                        <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                          <div className="text-pink-400 text-xs font-mono animate-pulse">AI</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-center text-xs font-mono text-gray-400">
                  {trainingImages.length} IMAGES TOTAL
                </div>
              </div>

              {/* Status Messages */}
              <div className="bg-black/40 backdrop-blur-sm border-2 border-gray-600/50 rounded-xl p-6">
                <h3 className="text-lg font-bold font-mono text-white uppercase tracking-wide mb-4">SYSTEM STATUS</h3>
                <div className="space-y-2 text-sm font-mono">
                  <div className="text-green-400">✓ GPU ACCELERATION: ENABLED</div>
                  <div className="text-green-400">✓ MEMORY USAGE: OPTIMAL</div>
                  <div className="text-cyan-400">⚡ NEURAL NETWORK: ACTIVE</div>
                  <div className="text-yellow-400">⏳ BATCH SIZE: 32</div>
                  <div className="text-pink-400">🧠 LEARNING RATE: 0.001</div>
                </div>
              </div>
            </div>
          </div>

          {/* Success/Error States */}
          {trainingStatus === "completed" && (
            <div className="mt-8 bg-green-900/40 border-2 border-green-400/50 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold font-mono text-green-400 uppercase tracking-wider mb-2">
                  TRAINING COMPLETE!
                </h2>
                <p className="text-green-300 font-mono mb-6">
                  Your AI model has been successfully trained and is ready for deployment.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => {
                      playSound("levelUp")
                      // Navigate to AI generation interface
                      window.location.href = "/generate"
                    }}
                    className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold font-mono uppercase tracking-wider px-8 py-4 text-lg border-2 border-purple-400 shadow-lg shadow-purple-500/25"
                    size="lg"
                  >
                    🎨 GENERATE IMAGES
                  </Button>
                  <Button
                    onClick={() => {
                      playSound("click")
                      onClose()
                    }}
                    className="bg-blue-900/80 border-2 border-blue-400/50 text-blue-300 hover:bg-blue-800/80 font-mono uppercase tracking-wide backdrop-blur-sm"
                    size="lg"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    BACK TO UPLOADER
                  </Button>
                </div>
              </div>
            </div>
          )}

          {trainingStatus === "cancelled" && (
            <div className="mt-8 bg-red-900/40 border-2 border-red-400/50 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-center">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold font-mono text-red-400 uppercase tracking-wider mb-2">
                  TRAINING CANCELLED
                </h2>
                <p className="text-red-300 font-mono">Training process has been terminated. Progress has been saved.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

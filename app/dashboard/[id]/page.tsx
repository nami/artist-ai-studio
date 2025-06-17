"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Clock,
  Zap,
  CheckCircle,
  AlertCircle,
  Cpu,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { checkTrainingStatus } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { useSound } from "@/contexts/sound-context"

interface Dataset {
  id: string
  name: string
  subject_name: string
  subject_type: string
  trigger_word: string
  training_status: string
  training_id: string
  model_version: string
  created_at: string
  updated_at: string
}

interface TrainingImage {
  id: string
  preview: string
  name: string
}

export default function TrainingDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const { play: playSound } = useSound()

  const trainingId = params.id as string

  // Data from API
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [trainingImages, setTrainingImages] = useState<TrainingImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Training status
  const [realTrainingStatus, setRealTrainingStatus] = useState<
    "pending" | "processing" | "completed" | "failed"
  >("pending")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isTrainingStarted, setIsTrainingStarted] = useState(false)

  // Load training data
  useEffect(() => {
    const fetchTrainingData = async () => {
      try {
        console.log('🔍 Loading training dashboard for:', trainingId)

        const response = await fetch(`/api/training/${trainingId}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch training data')
        }

        const data = await response.json()
        
        setDataset(data.dataset)
        setTrainingImages(data.trainingImages)
        
        // Determine if training has actually started based on status
        const status = data.dataset.training_status
        setRealTrainingStatus(status)
        
        if (status === "processing" || status === "completed" || status === "failed") {
          setIsTrainingStarted(true)
          setStartTime(new Date(data.dataset.created_at))
        } else {
          // Training created but not started yet
          setIsTrainingStarted(false)
        }

        console.log('✅ Training dashboard loaded:', {
          subject: data.dataset.subject_name,
          status: status,
          started: status !== "pending",
          imageCount: data.trainingImages.length
        })

      } catch (err) {
        console.error('💥 Failed to load training dashboard:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if (trainingId) {
      fetchTrainingData()
    }
  }, [trainingId])

  /* ———————————————————————————————————————————
     Helpers
  ——————————————————————————————————————————— */
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`
  }

  const getStatusDisplay = () => {
    if (!isTrainingStarted) {
      return {
        text: "READY TO START",
        color: "text-yellow-400",
        icon: <Clock className="w-4 h-4" />,
      }
    }

    switch (realTrainingStatus) {
      case "pending":
        return {
          text: "INITIALIZING",
          color: "text-yellow-400",
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
        }
      case "processing":
        return {
          text: "TRAINING",
          color: "text-cyan-400",
          icon: <Zap className="w-4 h-4 animate-pulse" />,
        }
      case "completed":
        return {
          text: "COMPLETE",
          color: "text-green-400",
          icon: <CheckCircle className="w-4 h-4" />,
        }
      case "failed":
        return {
          text: "FAILED",
          color: "text-red-400",
          icon: <AlertCircle className="w-4 h-4" />,
        }
      default:
        return {
          text: "UNKNOWN",
          color: "text-gray-400",
          icon: <Clock className="w-4 h-4" />,
        }
    }
  }

  const getEstimatedTime = () => {
    if (!isTrainingStarted) return "Click 'Start Training' to begin"
    if (realTrainingStatus === "completed") return "Completed"
    if (realTrainingStatus === "failed") return "Failed"
    if (realTrainingStatus === "pending") return "Starting..."

    // Typical Flux training takes 20-40 min
    const estimatedTotal = 25 * 60 // 25 min
    const remaining = Math.max(0, estimatedTotal - elapsedTime)
    return `~${formatTime(remaining)} remaining`
  }

  /* ———————————————————————————————————————————
     Start training function
  ——————————————————————————————————————————— */
  const initiateTraining = async () => {
    if (!user || !dataset || !trainingImages.length) {
      setRealTrainingStatus("failed")
      setErrorMessage("No images available for training")
      playSound("error")
      return
    }

    try {
      setStartTime(new Date())
      setIsTrainingStarted(true)
      setRealTrainingStatus("processing")

      // Get image URLs from training images
      const imageUrls = trainingImages.map(img => img.preview)

      const response = await fetch('/api/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrls,
          subjectName: dataset.subject_name,
          subjectType: dataset.subject_type,
          userId: user.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start training')
      }

      toast({
        title: "Training Started! 🎨",
        description: "Your model training has begun.",
      })
      playSound("levelUp")
      
    } catch (err) {
      console.error("Training start error:", err)
      setRealTrainingStatus("failed")
      setErrorMessage("Failed to start training")
      playSound("error")
      setIsTrainingStarted(false)

      toast({
        title: "Training Failed",
        description: "Could not start training. Please try again.",
        variant: "destructive",
      })
    }
  }

  /* ———————————————————————————————————————————
     Poll Supabase for status updates
  ——————————————————————————————————————————— */
  useEffect(() => {
    if (!dataset?.id) return

    const poll = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from("datasets")
          .select("training_status, error_message")
          .eq("id", dataset.id)
          .single()

        if (error) throw error
        if (!data) return

        setRealTrainingStatus(data.training_status)
        setErrorMessage(data.error_message)

        if (
          data.training_status === "completed" ||
          data.training_status === "failed"
        ) {
          clearInterval(poll)
        }
      } catch (err) {
        console.error("Status poll error:", err)
      }
    }, 5000) // 5 s

    return () => clearInterval(poll)
  }, [dataset?.id])

  /* ———————————————————————————————————————————
     Elapsed-time counter
  ——————————————————————————————————————————— */
  useEffect(() => {
    if (
      !startTime ||
      realTrainingStatus === "completed" ||
      realTrainingStatus === "failed"
    )
      return

    const t = setInterval(() => {
      const now = new Date()
      setElapsedTime(
        Math.floor((now.getTime() - startTime.getTime()) / 1000),
      )
    }, 1000)

    return () => clearInterval(t)
  }, [startTime, realTrainingStatus])

  /* ———————————————————————————————————————————
     Loading / Error States
  ——————————————————————————————————————————— */
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-white font-mono">Loading training dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !dataset) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center bg-red-900 border-2 border-red-400 p-6 rounded-lg">
          <h2 className="text-red-400 font-mono text-xl mb-2">Dashboard Error</h2>
          <p className="text-red-300 font-mono mb-4">{error || 'Training data not available'}</p>
          <button
            onClick={() => router.push('/training')}
            className="bg-gray-800 border-2 border-gray-600 text-white px-4 py-2 rounded font-mono hover:bg-gray-700"
          >
            ← Back to Training
          </button>
        </div>
      </div>
    )
  }

  /* ———————————————————————————————————————————
     UI helpers
  ——————————————————————————————————————————— */
  const statusDisplay = getStatusDisplay()

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
              <div className={`${statusDisplay.color} font-mono text-sm animate-pulse flex items-center gap-2`}>
                {statusDisplay.icon}
                {statusDisplay.text}
              </div>
            </div>
            <div className="flex gap-2">
              {!isTrainingStarted && realTrainingStatus !== "failed" && (
                <Button
                  onClick={() => {
                    playSound("click")
                    initiateTraining()
                  }}
                  disabled={!user || trainingImages.length === 0}
                  className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-black font-bold font-mono uppercase tracking-wider px-6 py-2 text-base border-2 border-green-400 shadow-lg shadow-green-500/25"
                >
                  ⚡ START TRAINING
                </Button>
              )}
              <Button
                onClick={() => {
                  playSound("click")
                  router.push('/training')
                }}
                className="bg-blue-900/80 border-2 border-blue-400/50 text-blue-300 hover:bg-blue-800/80 font-mono uppercase tracking-wide backdrop-blur-sm flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                BACK TO TRAINING
              </Button>
            </div>
          </div>

          {/* Subject Info Display */}
          <div className="bg-black/40 backdrop-blur-sm border-2 border-gray-600/50 rounded-xl p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <span className="text-gray-400 font-mono text-sm uppercase">Subject:</span>
                <div className="text-cyan-400 font-mono text-lg font-bold">{dataset.subject_name}</div>
              </div>
              <div>
                <span className="text-gray-400 font-mono text-sm uppercase">Type:</span>
                <div className="text-pink-400 font-mono text-lg font-bold">
                  {dataset.subject_type.charAt(0).toUpperCase() + dataset.subject_type.slice(1)}
                </div>
              </div>
              <div>
                <span className="text-gray-400 font-mono text-sm uppercase">Images:</span>
                <div className="text-yellow-400 font-mono text-lg font-bold">{trainingImages.length}</div>
              </div>
              <div>
                <span className="text-gray-400 font-mono text-sm uppercase">Elapsed:</span>
                <div className="text-green-400 font-mono text-lg font-bold">
                  {!isTrainingStarted ? "--:--" : formatTime(elapsedTime)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Training Status */}
            <div className="lg:col-span-2 space-y-6">
              {/* Main Status Display */}
              <div className="bg-black/40 backdrop-blur-sm border-2 border-gray-600/50 rounded-xl p-8">
                <div className="text-center space-y-6">
                  <div className="flex items-center justify-center">
                    <div className={`text-6xl ${statusDisplay.color}`}>
                      {!isTrainingStarted ? (
                        <Clock className="w-24 h-24" />
                      ) : realTrainingStatus === "processing" ? (
                        <Loader2 className="w-24 h-24 animate-spin" />
                      ) : realTrainingStatus === "completed" ? (
                        <CheckCircle className="w-24 h-24" />
                      ) : realTrainingStatus === "failed" ? (
                        <AlertCircle className="w-24 h-24" />
                      ) : (
                        <Clock className="w-24 h-24" />
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h2 className={`text-3xl font-bold font-mono ${statusDisplay.color} uppercase tracking-wider mb-2`}>
                      {statusDisplay.text}
                    </h2>
                    <p className="text-gray-400 font-mono text-lg">
                      {!isTrainingStarted ? (
                        <>Ready to train model for <span className="text-cyan-400">{dataset.subject_name}</span></>
                      ) : (
                        <>Training model for <span className="text-cyan-400">{dataset.subject_name}</span></>
                      )}
                    </p>
                  </div>

                  <div className="bg-black/60 border border-gray-600/50 rounded-lg p-4">
                    <div className="text-yellow-400 font-mono text-lg">
                      {getEstimatedTime()}
                    </div>
                    {realTrainingStatus === "processing" && (
                      <div className="text-gray-400 font-mono text-sm mt-2">
                        Training typically takes 20-40 minutes
                      </div>
                    )}
                    {!isTrainingStarted && (
                      <div className="text-gray-400 font-mono text-sm mt-2">
                        Review your images and click start when ready
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-black/40 backdrop-blur-sm border-2 border-gray-600/50 rounded-xl p-6">
                <h3 className="text-lg font-bold font-mono text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-pink-400" />
                  REPLICATE STATUS
                </h3>
                <div className="space-y-2 text-sm font-mono">
                  <div className="text-green-400">✓ MODEL: FLUX DEV LORA TRAINER</div>
                  <div className="text-green-400">✓ GPU: H100 (NVIDIA)</div>
                  <div className={`${realTrainingStatus === "processing" ? "text-cyan-400" : "text-gray-400"}`}>
                    ⚡ STATUS: {realTrainingStatus.toUpperCase()}
                  </div>
                  <div className="text-yellow-400">⏳ STEPS: 1000</div>
                  <div className="text-pink-400">🧠 LORA RANK: 16</div>
                  <div className="text-blue-400">🔗 TRAINING ID: {trainingId.slice(0, 8)}...</div>
                  <div className="text-purple-400">🎯 TRIGGER: {dataset.trigger_word}</div>
                </div>
              </div>
            </div>

            {/* Right Column - Training Images */}
            <div className="space-y-6">
              <div className="bg-black/40 backdrop-blur-sm border-2 border-gray-600/50 rounded-xl p-6">
                <h3 className="text-lg font-bold font-mono text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  TRAINING DATA
                </h3>
                <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600/50 scrollbar-track-gray-800/30 hover:scrollbar-thumb-gray-500/50">
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
                      {isTrainingStarted && realTrainingStatus === "processing" && (
                        <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
                          <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center text-xs font-mono text-gray-400">
                  {trainingImages.length} IMAGES UPLOADED
                </div>
              </div>
            </div>
          </div>

          {/* Success State */}
          {realTrainingStatus === "completed" && (
            <div className="mt-8 bg-green-900/40 border-2 border-green-400/50 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold font-mono text-green-400 uppercase tracking-wider mb-2">
                  TRAINING COMPLETE!
                </h2>
                <p className="text-green-300 font-mono mb-6">
                  Your AI model "{dataset.subject_name}" has been successfully trained and is ready for deployment.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => {
                      playSound("levelUp")
                      router.push("/generate")
                    }}
                    className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold font-mono uppercase tracking-wider px-8 py-4 text-lg border-2 border-purple-400 shadow-lg shadow-purple-500/25"
                    size="lg"
                  >
                    🎨 GENERATE IMAGES
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {realTrainingStatus === "failed" && (
            <div className="mt-8 bg-red-900/40 border-2 border-red-400/50 rounded-xl p-6 backdrop-blur-sm">
              <div className="text-center">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold font-mono text-red-400 uppercase tracking-wider mb-2">
                  TRAINING FAILED
                </h2>
                {errorMessage ? (
                  <div className="mb-4">
                    <p className="text-red-300 font-mono mb-2">Error Details:</p>
                    <div className="bg-black/60 border border-red-500/30 rounded-lg p-3 mx-auto max-w-md">
                      <code className="text-red-200 text-sm font-mono break-words">
                        {errorMessage}
                      </code>
                    </div>
                  </div>
                ) : (
                  <p className="text-red-300 font-mono mb-4">
                    An unexpected error occurred during training. Please try again.
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => {
                      playSound("click")
                      router.push('/training')
                    }}
                    className="bg-red-900/80 border-2 border-red-400/50 text-red-300 hover:bg-red-800/80 font-mono uppercase tracking-wide backdrop-blur-sm"
                    size="lg"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    BACK TO TRAINING
                  </Button>
                  <Button
                    onClick={() => {
                      playSound("click")
                      router.push('/training')
                    }}
                    className="bg-blue-900/80 border-2 border-blue-400/50 text-blue-300 hover:bg-blue-800/80 font-mono uppercase tracking-wide backdrop-blur-sm"
                    size="lg"
                  >
                    TRY AGAIN
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
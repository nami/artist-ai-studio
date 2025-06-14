"use client"
import { useState, useEffect } from "react"
import { ArrowLeft, Clock, Zap, CheckCircle, AlertCircle, Cpu, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { startTraining } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

interface TrainingDashboardProps {
  onClose: () => void
  trainingImages: Array<{ id: string; preview: string; name?: string }>
  playSound: (sound: string) => void
  subjectName: string
  subjectType: string
  imageUrls: string[]
}

export function TrainingDashboard({ 
  onClose, 
  trainingImages, 
  playSound,
  subjectName,
  subjectType,
  imageUrls
}: TrainingDashboardProps) {
  const { user, isConfigured } = useAuth()
  const { toast } = useToast()
  
  // Real training state
  const [datasetId, setDatasetId] = useState<string | null>(null)
  const [trainingId, setTrainingId] = useState<string | null>(null)
  const [realTrainingStatus, setRealTrainingStatus] = useState<"pending" | "processing" | "completed" | "failed">("pending")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isTrainingStarted, setIsTrainingStarted] = useState(false)

  // Check configuration on mount
  useEffect(() => {
    if (!isConfigured) {
      setRealTrainingStatus("failed")
      setErrorMessage("Supabase is not configured. Please check your environment variables.")
      playSound("error")
    }
  }, [isConfigured, playSound])

  // Manual training start function
  const initiateTraining = async () => {
    if (!user || !imageUrls.length) return

    try {
      setStartTime(new Date())
      setIsTrainingStarted(true)
      
      const result = await startTraining({
        imageUrls,
        subjectName,
        subjectType,
        userId: user.id,
      })
      
      setDatasetId(result.datasetId)
      setTrainingId(result.trainingId)
      setRealTrainingStatus("processing")
      
      toast({
        title: 'Training Started! 🎨',
        description: 'Your model training has begun.',
      })
      
      playSound("levelUp")
    } catch (error) {
      console.error('Training start error:', error)
      setRealTrainingStatus("failed")
      setErrorMessage("Failed to start training")
      playSound("error")
      setIsTrainingStarted(false)
      
      toast({
        title: 'Training Failed',
        description: 'Could not start training. Please try again.',
        variant: 'destructive',
      })
    }
  }

  // Poll for training status updates
  useEffect(() => {
    if (!isConfigured || !datasetId) return

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('datasets')
          .select('training_status, error_message, model_version')
          .eq('id', datasetId)
          .single()

        if (error) throw error

        if (data) {
          setRealTrainingStatus(data.training_status)
          setErrorMessage(data.error_message)
          
          // Update UI based on real status
          if (data.training_status === "completed") {
            playSound("complete")
            clearInterval(pollInterval)
          } else if (data.training_status === "failed") {
            playSound("error")
            clearInterval(pollInterval)
          }
        }
      } catch (error) {
        console.error('Status poll error:', error)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }, [datasetId, playSound, isConfigured])

  // Update elapsed time
  useEffect(() => {
    if (!startTime || realTrainingStatus === "completed" || realTrainingStatus === "failed") return

    const interval = setInterval(() => {
      const now = new Date()
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
      setElapsedTime(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, realTrainingStatus])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getStatusDisplay = () => {
    if (!isTrainingStarted) {
      return { text: "READY TO START", color: "text-yellow-400", icon: <Clock className="w-4 h-4" /> }
    }
    
    switch (realTrainingStatus) {
      case "pending":
        return { text: "INITIALIZING", color: "text-yellow-400", icon: <Loader2 className="w-4 h-4 animate-spin" /> }
      case "processing":
        return { text: "TRAINING", color: "text-cyan-400", icon: <Zap className="w-4 h-4 animate-pulse" /> }
      case "completed":
        return { text: "COMPLETE", color: "text-green-400", icon: <CheckCircle className="w-4 h-4" /> }
      case "failed":
        return { text: "FAILED", color: "text-red-400", icon: <AlertCircle className="w-4 h-4" /> }
      default:
        return { text: "UNKNOWN", color: "text-gray-400", icon: <Clock className="w-4 h-4" /> }
    }
  }

  const statusDisplay = getStatusDisplay()

  const getEstimatedTime = () => {
    if (!isTrainingStarted) return "Click 'Start Training' to begin"
    if (realTrainingStatus === "completed") return "Completed"
    if (realTrainingStatus === "failed") return "Failed"
    if (realTrainingStatus === "pending") return "Starting..."
    
    // Typical Flux training takes 20-40 minutes
    const estimatedTotal = 25 * 60 // 25 minutes in seconds
    const remaining = Math.max(0, estimatedTotal - elapsedTime)
    return `~${formatTime(remaining)} remaining`
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
                  disabled={!user || !isConfigured}
                  className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-black font-bold font-mono uppercase tracking-wider px-6 py-2 text-base border-2 border-green-400 shadow-lg shadow-green-500/25"
                >
                  ⚡ START TRAINING
                </Button>
              )}
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
          </div>

          {/* Subject Info Display */}
          <div className="bg-black/40 backdrop-blur-sm border-2 border-gray-600/50 rounded-xl p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <span className="text-gray-400 font-mono text-sm uppercase">Subject:</span>
                <div className="text-cyan-400 font-mono text-lg font-bold">{subjectName}</div>
              </div>
              <div>
                <span className="text-gray-400 font-mono text-sm uppercase">Type:</span>
                <div className="text-pink-400 font-mono text-lg font-bold">{subjectType}</div>
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
                        <>Ready to train model for <span className="text-cyan-400">{subjectName}</span></>
                      ) : (
                        <>Training model for <span className="text-cyan-400">{subjectName}</span></>
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
                  {trainingId && (
                    <div className="text-blue-400">🔗 TRAINING ID: {trainingId.slice(0, 8)}...</div>
                  )}
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
                <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
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
                  Your AI model "{subjectName}" has been successfully trained and is ready for deployment.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => {
                      playSound("levelUp")
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
                      onClose()
                    }}
                    className="bg-red-900/80 border-2 border-red-400/50 text-red-300 hover:bg-red-800/80 font-mono uppercase tracking-wide backdrop-blur-sm"
                    size="lg"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    BACK TO UPLOADER
                  </Button>
                  <Button
                    onClick={() => {
                      playSound("click")
                      window.location.reload()
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
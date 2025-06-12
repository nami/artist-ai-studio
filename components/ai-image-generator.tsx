"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  ArrowLeft,
  Wand2,
  Settings,
  History,
  Lightbulb,
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
  Shuffle,
  Zap,
  Volume2,
  VolumeX,
  Sparkles,
  Palette,
  Cpu,
  Target,
  Clock,
  Eye,
  Heart,
  Edit,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { saveGalleryImage, type GalleryImage } from "@/utils/gallery-storage"
import { useRouter } from "next/navigation"
import { useSound } from "@/contexts/sound-context"
import { toast } from "sonner"

interface AIImageGeneratorProps {
  onBack: () => void
  editedImage?: any
}

interface GeneratedImage {
  id: string
  prompt: string
  style: string
  imageUrl: string
  timestamp: string
  settings: {
    steps: number
    guidance: number
    seed: number
  }
}

interface PromptTemplate {
  id: string
  name: string
  prompt: string
  category: string
  emoji: string
}

interface AnimatedElement {
  id: number;
  left: number;
  top: number;
  animationDelay: number;
  animationDuration: number;
}

const STYLE_PRESETS = [
  {
    id: "none",
    name: "No Style",
    color: "from-gray-500 to-gray-400",
    description: "Generate without applying any specific style",
  },
  {
    id: "retro-pixel",
    name: "Retro Pixel Art",
    color: "from-green-500 to-lime-400",
    description: "Classic 8-bit pixel art style",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    color: "from-purple-500 to-pink-400",
    description: "Futuristic neon cyberpunk aesthetic",
  },
  {
    id: "synthwave",
    name: "Synthwave",
    color: "from-pink-500 to-orange-400",
    description: "80s retro synthwave vibes",
  },
  {
    id: "vaporwave",
    name: "Vaporwave",
    color: "from-cyan-500 to-purple-400",
    description: "Dreamy vaporwave aesthetics",
  },
  {
    id: "neon-noir",
    name: "Neon Noir",
    color: "from-blue-500 to-cyan-400",
    description: "Dark neon-lit noir atmosphere",
  },
  {
    id: "glitch-art",
    name: "Glitch Art",
    color: "from-red-500 to-yellow-400",
    description: "Digital corruption and glitch effects",
  },
]

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "1",
    name: "Retro Character",
    prompt: "A pixelated character in retro game style, 8-bit graphics, vibrant colors",
    category: "Characters",
    emoji: "🎮",
  },
  {
    id: "2",
    name: "Cyberpunk City",
    prompt: "Futuristic cyberpunk cityscape with neon lights, flying cars, and holographic displays",
    category: "Environments",
    emoji: "🌃",
  },
  {
    id: "3",
    name: "Space Adventure",
    prompt: "Retro space scene with pixel art spaceship, stars, and alien planets",
    category: "Sci-Fi",
    emoji: "🚀",
  },
  {
    id: "4",
    name: "Fantasy Castle",
    prompt: "Medieval fantasy castle in pixel art style, magical atmosphere, glowing crystals",
    category: "Fantasy",
    emoji: "🏰",
  },
  {
    id: "5",
    name: "Neon Portrait",
    prompt: "Portrait with neon lighting effects, synthwave aesthetic, retro-futuristic style",
    category: "Portraits",
    emoji: "👾",
  },
  {
    id: "6",
    name: "Glitch Effect",
    prompt: "Digital glitch art effect, corrupted data visualization, colorful noise patterns",
    category: "Abstract",
    emoji: "⚡",
  },
]

export default function AIImageGenerator({ onBack, editedImage }: AIImageGeneratorProps) {
  const router = useRouter()
  const [prompt, setPrompt] = useState("")
  const [selectedStyle, setSelectedStyle] = useState("none")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [recentPrompts, setRecentPrompts] = useState<string[]>([])
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [steps, setSteps] = useState<number[]>([20])
  const [guidance, setGuidance] = useState<number[]>([7.5])
  const [seed, setSeed] = useState<number[]>([])
  const [isClient, setIsClient] = useState(false)
  const [animatedElements, setAnimatedElements] = useState<AnimatedElement[]>([])

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const {
    play: playSound,
    isMuted: isGlobalMuted,
    toggleMute: toggleGlobalMute,
    initialize: initializeSounds,
  } = useSound()

  useEffect(() => {
    initializeSounds()
    setIsClient(true)
    setSeed([Math.floor(Math.random() * 1000000)])
    
    // Generate animated elements once on client side
    const elements: AnimatedElement[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDelay: Math.random() * 3,
      animationDuration: 2 + Math.random() * 4,
    }));
    
    setAnimatedElements(elements);
    
    const placeholderImage = {
      id: "demo-image",
      prompt: "A beautiful landscape with mountains and sunset",
      style: "none",
      imageUrl: "https://picsum.photos/512/512?random=1",
      timestamp: new Date().toISOString(),
      settings: {
        steps: 20,
        guidance: 7.5,
        seed: Math.floor(Math.random() * 1000000),
      },
    }
    setGeneratedImages([placeholderImage])
    setCurrentImage(placeholderImage)
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) {
      if (!prompt.trim()) {
        toast.error("Prompt cannot be empty.", { description: "Please describe the image you want to create." })
      }
      return
    }

    setIsGenerating(true)
    playSound("upload")
    const toastId = toast.loading("Generating your masterpiece...", {
      description: "The AI is hard at work. This might take a moment.",
    })

    setRecentPrompts((prev) => {
      const updated = [prompt, ...prev.filter((p) => p !== prompt)].slice(0, 10)
      return updated
    })

    setTimeout(() => {
      const newImage: GeneratedImage = {
        id: Math.random().toString(36).substr(2, 9),
        prompt,
        style: selectedStyle,
        imageUrl: `https://picsum.photos/512/512?random=${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        settings: {
          steps: steps[0],
          guidance: guidance[0],
          seed: seed[0],
        },
      }

      setGeneratedImages((prev) => [newImage, ...prev.filter((img) => img.id !== newImage.id)])
      setCurrentImage(newImage)
      setIsGenerating(false)
      playSound("complete")
      toast.success("Image generated successfully!", {
        id: toastId,
        description: `Prompt: ${prompt.substring(0, 30)}... Style: ${STYLE_PRESETS.find((s) => s.id === selectedStyle)?.name || "None"}`,
      })
    }, 3000)
  }, [prompt, selectedStyle, steps, guidance, seed, isGenerating, playSound])

  const handleTemplateSelect = (template: PromptTemplate) => {
    setPrompt(template.prompt)
    playSound("click")
    setIsTemplatesOpen(false)
    textareaRef.current?.focus()
    toast.info("Template applied!", { description: `Using "${template.name}" template.` })
  }

  const handlePromptFromHistory = (historicalPrompt: string) => {
    setPrompt(historicalPrompt)
    playSound("click")
    setIsHistoryOpen(false)
    textareaRef.current?.focus()
    toast.info("Prompt loaded from history.")
  }

  const randomizeSeed = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 1000000)
    setSeed([newSeed])
    playSound("click")
    toast.success(`Seed randomized to ${newSeed}!`, { description: "A new touch of chaos for your creation." })
  }, [playSound])

  const copyPrompt = () => {
    if (!prompt) {
      toast.error("Nothing to copy!", { description: "The prompt is empty." })
      return
    }
    navigator.clipboard.writeText(prompt)
    playSound("click")
    toast.success("Prompt copied to clipboard!")
  }

  const downloadImage = (imageToDownload: GeneratedImage | null) => {
    if (!imageToDownload) {
      toast.error("No image selected to download.")
      return
    }
    playSound("click")
    toast.success("Image download started!", {
      description: `Downloading: ${imageToDownload.prompt.substring(0, 20)}...`,
    })
    const link = document.createElement("a")
    link.href = imageToDownload.imageUrl
    link.download = `ai_image_${imageToDownload.id.substring(0, 6)}_${imageToDownload.prompt.substring(0, 10).replace(/\s/g, "_")}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const selectedStyleData = STYLE_PRESETS.find((style) => style.id === selectedStyle)

  const saveToGallery = (imageToSave: GeneratedImage | null) => {
    if (!imageToSave) {
      toast.error("No image selected to save.")
      return
    }
    
    const galleryImage: GalleryImage = {
      ...imageToSave,
      timestamp: new Date(imageToSave.timestamp),
      isFavorite: false,
      tags: [
        imageToSave.style,
        ...imageToSave.prompt
          .split(" ")
          .filter((tag) => tag.length > 3)
          .slice(0, 3),
      ],
      metadata: {
        width: 512,
        height: 512,
        fileSize: Math.floor(Math.random() * (2048000 - 512000 + 1) + 512000),
      },
    }
    
    const saved = saveGalleryImage(galleryImage)
    if (saved) {
      playSound("complete")
      toast.success("Image saved to gallery!", {
        description: `"${imageToSave.prompt.substring(0, 30)}..." is now in your collection.`,
      })
    } else {
      playSound("error")
      toast.error("Failed to save image to gallery.", {
        description: "There might be an issue with storage or the image data.",
      })
    }
  }

  const handleEditImage = useCallback(() => {
    if (!currentImage) {
      toast.error("No image selected for editing")
      return
    }
    
    playSound("click")
    
    try {
      sessionStorage.setItem("editImageData", JSON.stringify(currentImage))
      window.location.href = "/edit"
    } catch (error) {
      toast.error("Failed to prepare image for editing")
    }
  }, [currentImage])

  useEffect(() => {
    if (editedImage) {
      const newImage: GeneratedImage = {
        id: Math.random().toString(36).substr(2, 9),
        prompt: editedImage.originalData?.prompt || editedImage.prompt || "Edited image",
        style: editedImage.originalData?.style || editedImage.style || "none",
        imageUrl: editedImage.imageUrl,
        timestamp: new Date().toISOString(),
        settings: {
          steps: editedImage.originalData?.settings?.steps || editedImage.settings?.steps || 20,
          guidance: editedImage.originalData?.settings?.guidance || editedImage.settings?.guidance || 7.5,
          seed: editedImage.originalData?.settings?.seed || editedImage.settings?.seed || Math.floor(Math.random() * 1000000),
        },
      }

      setGeneratedImages((prev) => [newImage, ...prev.filter((img) => img.id !== newImage.id)])
      setCurrentImage(newImage)
      playSound("complete")
      toast.success("Image loaded from editor!", { description: "Ready for further generation or saving." })
    }
  }, [editedImage, playSound])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (!isClient) {
    return null
  }

  return (
    <div className="w-full min-h-screen bg-black p-2 sm:p-4 lg:p-6">
      <button
        onClick={() => {
          toggleGlobalMute()
        }}
        className="fixed top-4 right-4 z-50 bg-black border-2 border-gray-600 p-2 rounded-full hover:border-cyan-400 transition-colors duration-300"
        aria-label={isGlobalMuted ? "Unmute sound effects" : "Mute sound effects"}
      >
        {isGlobalMuted ? <VolumeX className="w-5 h-5 text-gray-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
      </button>

      <div className="bg-gray-900 p-4 sm:p-6 lg:p-8 rounded-lg border-4 border-gray-700 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.3) 2px, rgba(0, 255, 0, 0.3) 4px)",
            }}
          />
        </div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {animatedElements.map((element) => (
            <div
              key={element.id}
              className="absolute w-1 h-1 sm:w-2 sm:h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse opacity-30"
              style={{
                left: `${element.left}%`,
                top: `${element.top}%`,
                animationDelay: `${element.animationDelay}s`,
                animationDuration: `${element.animationDuration}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 p-0.5 sm:p-1 rounded-lg animate-pulse">
              <div className="bg-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-md">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 uppercase tracking-wider">
                  🎨 AI DREAM MACHINE 🎨
                </h1>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded-full animate-pulse"></div>
              <div className="text-green-400 font-mono text-xs sm:text-sm animate-pulse">NEURAL NET ONLINE</div>
            </div>
          </div>
          <Button
            onClick={() => {
              playSound("click")
              onBack()
            }}
            variant="outline"
            className="bg-blue-900/80 border-2 border-blue-400/50 text-blue-300 hover:bg-blue-800/80 font-mono uppercase tracking-wide backdrop-blur-sm flex items-center gap-2 hover:scale-105 transition-transform text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            BACK TO TRAINING
          </Button>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-br from-black/60 via-purple-900/20 to-pink-900/20 backdrop-blur-sm border-2 border-purple-400/50 rounded-xl p-4 sm:p-6 shadow-lg shadow-purple-500/10">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base sm:text-lg font-bold font-mono text-white uppercase tracking-wide flex items-center gap-2">
                  <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 animate-pulse" />
                  IMAGINATION INPUT
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-pink-400 animate-bounce" />
                </Label>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`font-mono text-xs border-2 ${
                      prompt.length > 400
                        ? "border-red-400 text-red-400"
                        : prompt.length > 300
                          ? "border-yellow-400 text-yellow-400"
                          : "border-green-400 text-green-400"
                    }`}
                  >
                    {prompt.length}/500
                  </Badge>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copyPrompt}
                    disabled={!prompt}
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:scale-105 transition-transform w-8 h-8 sm:w-9 sm:h-9"
                    aria-label="Copy prompt"
                  >
                    <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </div>

              <Textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="✨ Describe your wildest dreams... (Ctrl+K to focus, Ctrl+Enter to create magic!)"
                className="min-h-[100px] sm:min-h-[120px] bg-gray-800/50 border-2 border-purple-400/30 text-white placeholder-gray-400 font-mono resize-none focus:border-purple-400 focus:ring-purple-400/20 focus:ring-4 transition-all text-sm sm:text-base"
                maxLength={500}
              />

              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsTemplatesOpen(!isTemplatesOpen)
                    playSound("click")
                  }}
                  className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-2 border-purple-400/50 text-purple-300 hover:bg-purple-800/50 font-mono text-xs hover:scale-105 transition-transform flex-grow sm:flex-grow-0"
                >
                  <Lightbulb className="w-3 h-3 mr-1 animate-pulse" />
                  MAGIC TEMPLATES
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsHistoryOpen(!isHistoryOpen)
                    playSound("click")
                  }}
                  className="bg-gradient-to-r from-blue-900/50 to-cyan-900/50 border-2 border-blue-400/50 text-blue-300 hover:bg-blue-800/50 font-mono text-xs hover:scale-105 transition-transform flex-grow sm:flex-grow-0"
                >
                  <History className="w-3 h-3 mr-1" />
                  TIME MACHINE
                </Button>
              </div>

              <Collapsible open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen}>
                <CollapsibleContent className="mt-4">
                  <div className="bg-gradient-to-br from-gray-800/50 to-purple-800/30 border-2 border-purple-400/30 rounded-lg p-3 sm:p-4 backdrop-blur-sm">
                    <h4 className="text-xs sm:text-sm font-mono text-purple-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                      INSPIRATION VAULT
                    </h4>
                    <ScrollArea className="h-48 sm:h-60">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        {PROMPT_TEMPLATES.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => handleTemplateSelect(template)}
                            className="text-left p-3 bg-gradient-to-br from-gray-700/50 to-gray-600/30 hover:from-purple-700/50 hover:to-pink-700/30 border-2 border-gray-600/30 hover:border-purple-400/50 rounded-lg transition-all group hover:scale-105"
                          >
                            <div className="flex items-center gap-2 mb-1 sm:mb-2">
                              <span className="text-base sm:text-lg">{template.emoji}</span>
                              <div className="text-xs text-purple-400 font-mono uppercase">{template.category}</div>
                            </div>
                            <div className="text-xs sm:text-sm text-white font-mono font-bold mb-1">
                              {template.name}
                            </div>
                            <div className="text-xs text-gray-400 line-clamp-2">{template.prompt}</div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <CollapsibleContent className="mt-4">
                  <div className="bg-gradient-to-br from-gray-800/50 to-blue-800/30 border-2 border-blue-400/30 rounded-lg p-3 sm:p-4 backdrop-blur-sm">
                    <h4 className="text-xs sm:text-sm font-mono text-blue-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <History className="w-3 h-3 sm:w-4 sm:h-4" />
                      MEMORY BANK
                    </h4>
                    <ScrollArea className="h-48 sm:h-60">
                      {recentPrompts.length > 0 ? (
                        <div className="space-y-2">
                          {recentPrompts.map((recentPrompt, index) => (
                            <button
                              key={index}
                              onClick={() => handlePromptFromHistory(recentPrompt)}
                              className="w-full text-left p-2 sm:p-3 bg-gradient-to-r from-gray-700/50 to-blue-700/30 hover:from-blue-700/50 hover:to-cyan-700/30 border border-gray-600/30 hover:border-blue-400/50 rounded text-xs sm:text-sm text-gray-300 font-mono transition-all hover:scale-[1.02]"
                            >
                              <span className="text-blue-400 mr-2">#{index + 1}</span>
                              {recentPrompt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-xs sm:text-sm font-mono text-center py-4">
                          <History className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
                          No memories yet... Create your first masterpiece!
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="bg-gradient-to-br from-black/60 via-pink-900/20 to-purple-900/20 backdrop-blur-sm border-2 border-pink-400/50 rounded-xl p-4 sm:p-6 shadow-lg shadow-pink-500/10">
              <Label className="text-base sm:text-lg font-bold font-mono text-white uppercase tracking-wide mb-4 block flex items-center gap-2">
                <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400 animate-pulse" />
                ARTISTIC STYLE (OPTIONAL)
                <Target className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400" />
              </Label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
                {STYLE_PRESETS.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => {
                      setSelectedStyle(style.id)
                      playSound("click")
                    }}
                    className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                      selectedStyle === style.id
                        ? `border-white bg-gradient-to-br ${style.color} shadow-lg`
                        : "border-gray-600/50 bg-gray-800/50 hover:border-gray-400"
                    }`}
                  >
                    <div className="text-center space-y-1 sm:space-y-2">
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-lg border-2 ${
                          selectedStyle === style.id ? "border-white" : "border-gray-600"
                        } bg-gradient-to-br ${style.color} flex items-center justify-center`}
                      />
                      <div
                        className={`text-xs font-mono font-bold uppercase tracking-wide ${
                          selectedStyle === style.id ? "text-white" : "text-gray-300"
                        }`}
                      >
                        {style.name}
                      </div>
                      <div
                        className={`hidden sm:block text-xs ${selectedStyle === style.id ? "text-gray-200" : "text-gray-500"}`}
                      >
                        {style.description}
                      </div>
                    </div>
                    {selectedStyle === style.id && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                        <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-600" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {selectedStyleData && selectedStyleData.id !== "none" && (
                <div
                  className={`p-2 sm:p-3 rounded-lg bg-gradient-to-r ${selectedStyleData.color} bg-opacity-20 border border-white/20`}
                >
                  <div className="text-white font-mono text-xs sm:text-sm font-bold">
                    ✨ Selected: {selectedStyleData.name}
                  </div>
                  <div className="text-gray-200 text-xs mt-1">{selectedStyleData.description}</div>
                </div>
              )}
            </div>

            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full bg-gradient-to-r from-gray-800/50 to-cyan-800/30 border-2 border-cyan-400/50 text-white hover:bg-gray-700/50 font-mono justify-between hover:scale-105 transition-transform text-sm sm:text-base py-2.5 sm:py-3"
                  onClick={() => playSound("click")}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    NEURAL PARAMETERS
                    <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
                  </div>
                  {isAdvancedOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="bg-gradient-to-br from-black/60 via-cyan-900/20 to-blue-900/20 backdrop-blur-sm border-2 border-cyan-400/50 rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-lg shadow-cyan-500/10">
                  <div>
                    <Label className="text-xs sm:text-sm font-mono text-white uppercase tracking-wide mb-2 block flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" />
                      INFERENCE STEPS: {steps[0]}
                      <Badge
                        variant="outline"
                        className="bg-yellow-400/20 text-yellow-400 border-yellow-400/50 text-xs"
                      >
                        {steps[0] < 15 ? "FAST" : steps[0] < 30 ? "BALANCED" : "QUALITY"}
                      </Badge>
                    </Label>
                    <Slider value={steps} onValueChange={setSteps} max={50} min={10} step={1} className="w-full" />
                    <div className="flex justify-between text-xs text-gray-400 font-mono mt-1">
                      <span>⚡ FAST (10)</span>
                      <span>🎯 QUALITY (50)</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-mono text-white uppercase tracking-wide mb-2 block flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
                      GUIDANCE SCALE: {guidance[0]}
                      <Badge
                        variant="outline"
                        className="bg-purple-400/20 text-purple-400 border-purple-400/50 text-xs"
                      >
                        {guidance[0] < 5 ? "CREATIVE" : guidance[0] < 12 ? "BALANCED" : "PRECISE"}
                      </Badge>
                    </Label>
                    <Slider
                      value={guidance}
                      onValueChange={setGuidance}
                      max={20}
                      min={1}
                      step={0.5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400 font-mono mt-1">
                      <span>🎨 CREATIVE (1)</span>
                      <span>🎯 PRECISE (20)</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm font-mono text-white uppercase tracking-wide mb-2 block flex items-center gap-2">
                      <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />
                      RANDOM SEED
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={seed[0]}
                        onChange={(e) => setSeed([Number.parseInt(e.target.value) || 0])}
                        className="bg-gray-800/50 border-2 border-green-400/30 text-white font-mono focus:border-green-400 focus:ring-green-400/20 text-sm sm:text-base"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={randomizeSeed}
                        className="bg-gradient-to-r from-yellow-900/50 to-green-900/50 border-2 border-yellow-400/50 text-yellow-300 hover:bg-yellow-800/50 font-mono hover:scale-105 transition-transform w-10 h-10 sm:w-auto sm:px-3"
                        aria-label="Randomize seed"
                      >
                        <Shuffle className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              size="lg"
              className="w-full bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 hover:from-purple-500 hover:via-pink-400 hover:to-cyan-400 text-white font-bold font-mono uppercase tracking-wider py-4 sm:py-6 text-lg sm:text-2xl border-2 sm:border-4 border-white/20 shadow-2xl shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-300 relative overflow-hidden"
            >
              {isGenerating ? (
                <div className="flex items-center gap-2 sm:gap-4">
                  <Loader2 className="w-5 h-5 sm:w-8 sm:h-8 text-white animate-spin" />
                  <span className="animate-pulse">CREATING MAGIC...</span>
                  <Sparkles className="hidden sm:block w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-4">
                  <Zap className="w-5 h-5 sm:w-8 sm:h-8 animate-pulse" />
                  <span>UNLEASH CREATIVITY</span>
                  <Wand2 className="hidden sm:block w-5 h-5 sm:w-8 sm:h-8 animate-bounce" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-[shimmer_2s_infinite]"></div>
            </Button>
            <Button
              onClick={() => {
                playSound("click")
                router.push("/gallery")
              }}
              size="lg"
              variant="outline"
              className="w-full bg-gradient-to-r from-cyan-700/80 to-blue-600/80 hover:from-cyan-600/80 hover:to-blue-500/80 text-white font-bold font-mono uppercase tracking-wider py-3 sm:py-4 text-base sm:text-lg border-2 border-cyan-400/70 shadow-lg shadow-cyan-500/25 hover:scale-[1.03] transition-transform"
            >
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              VIEW GALLERY
            </Button>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-black/60 via-purple-900/20 to-pink-900/20 backdrop-blur-sm border-2 border-purple-400/50 rounded-xl p-4 sm:p-6 shadow-lg shadow-purple-500/10">
              <h3 className="text-base sm:text-lg font-bold font-mono text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 animate-pulse" />
                MASTERPIECE PREVIEW
              </h3>

              {currentImage ? (
                <div className="space-y-3 sm:space-y-4">
                  <div className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden border-2 sm:border-4 border-gradient-to-r from-purple-400 to-pink-400 shadow-lg">
                    <img
                      src={currentImage.imageUrl || "/placeholder.svg"}
                      alt={currentImage.prompt}
                      className="w-full h-full object-cover"
                      width="512"
                      height="512"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="text-xs font-mono text-purple-400 uppercase flex items-center gap-1 sm:gap-2">
                      <Wand2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      PROMPT
                    </div>
                    <div className="text-xs sm:text-sm text-white font-mono bg-gradient-to-r from-gray-800/50 to-purple-800/30 p-2 sm:p-3 rounded-lg border border-purple-400/30 line-clamp-3">
                      {currentImage.prompt}
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Palette className="w-3 h-3" />
                        {STYLE_PRESETS.find((s) => s.id === currentImage.style)?.name || "N/A"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Shuffle className="w-3 h-3" />
                        {currentImage.settings.seed}
                      </span>
                    </div>
                    <div className="text-xs text-cyan-400 font-mono flex items-center gap-1">
                      <span className="w-2.5 h-2.5 sm:w-3 sm:h-3">🕐</span>
                      {formatTimestamp(currentImage.timestamp)}
                    </div>
                    <Button
                      size="sm"
                      onClick={handleEditImage}
                      className="w-full bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border-2 border-cyan-400/50 text-cyan-300 hover:bg-cyan-800/50 font-mono hover:scale-105 transition-transform text-xs sm:text-sm"
                    >
                      <Edit className="w-3 h-3 mr-1.5 sm:mr-2" />
                      EDIT MASTERPIECE
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => downloadImage(currentImage)}
                      className="w-full bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-2 border-green-400/50 text-green-300 hover:bg-green-800/50 font-mono hover:scale-105 transition-transform text-xs sm:text-sm"
                    >
                      <Download className="w-3 h-3 mr-1.5 sm:mr-2" />
                      DOWNLOAD MASTERPIECE
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveToGallery(currentImage)}
                      className="w-full bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-2 border-purple-400/50 text-purple-300 hover:bg-purple-800/50 font-mono hover:scale-105 transition-transform text-xs sm:text-sm"
                    >
                      <Heart className="w-3 h-3 mr-1.5 sm:mr-2" />
                      SAVE TO GALLERY
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="aspect-square bg-gradient-to-br from-gray-800/50 to-purple-800/30 rounded-lg border-2 sm:border-4 border-dashed border-purple-400/50 flex items-center justify-center">
                  <div className="text-center text-gray-500 font-mono p-4">
                    <Wand2 className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-50 animate-pulse" />
                    <div className="text-sm sm:text-lg uppercase mb-1 sm:mb-2">Ready to Create</div>
                    <div className="text-xs sm:text-sm">Your next masterpiece awaits...</div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-black/60 via-blue-900/20 to-cyan-900/20 backdrop-blur-sm border-2 border-cyan-400/50 rounded-xl p-4 sm:p-6 shadow-lg shadow-cyan-500/10">
              <h3 className="text-base sm:text-lg font-bold font-mono text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                <History className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                CREATION ARCHIVE
              </h3>

              <ScrollArea className="h-56 sm:h-64">
                {generatedImages.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {generatedImages.map((image, index) => (
                      <button
                        key={image.id}
                        onClick={() => {
                          setCurrentImage(image)
                          playSound("click")
                        }}
                        className="w-full p-2 sm:p-3 bg-gradient-to-r from-gray-800/50 to-cyan-800/30 hover:from-cyan-700/50 hover:to-blue-700/30 border-2 border-gray-600/30 hover:border-cyan-400/50 rounded-lg transition-all text-left group hover:scale-[1.02]"
                      >
                        <div className="flex gap-2 sm:gap-3">
                          <div className="relative flex-shrink-0">
                            <img
                              src={image.imageUrl || "/placeholder.svg"}
                              alt={image.prompt.substring(0, 30)}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded border-2 border-gray-600 object-cover"
                              width="64"
                              height="64"
                            />
                            <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-cyan-400 text-black rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                              {generatedImages.length - index}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-cyan-400 font-mono flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              {formatTimestamp(image.timestamp)}
                            </div>
                            <div className="text-xs sm:text-sm text-white font-mono truncate">{image.prompt}</div>
                            <div className="text-xs text-purple-400 font-mono flex items-center gap-1">
                              <Palette className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              {STYLE_PRESETS.find((s) => s.id === image.style)?.name || "N/A"}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 font-mono text-xs sm:text-sm py-8">
                    <History className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                    <div className="text-sm sm:text-lg mb-1 sm:mb-2">No creations yet</div>
                    <div>Start your artistic journey!</div>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
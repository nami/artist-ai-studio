"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSaveToGallery } from "@/utils/gallery-storage";
import { Save, Heart, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSound } from "@/contexts/sound-context";
import { useAsyncGeneration } from "@/hooks/use-async-generation";

interface AIImageGeneratorProps {
  onBack: () => void;
  editedImage?: GeneratedImage;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  style: string;
  imageUrl: string;
  timestamp: string;
  modelId?: string;
  modelName?: string;
  settings: {
    steps: number;
    guidance: number;
    seed?: number;
  };
}

interface TrainedModel {
  id: string;
  subject_name: string;
  subject_type: string;
  model_version: string;
  created_at: string;
  training_status: "completed" | "processing" | "failed";
}

interface AnimatedElement {
  id: number;
  left: number;
  top: number;
  animationDelay: number;
  animationDuration: number;
}

// 🎯 Dynamic prompting guides based on model type
const PROMPTING_GUIDES = {
  person: {
    title: "Person Model Prompting",
    description: "Your model learned a specific person's appearance",
    structure: "{trigger}, {action/pose}, {setting}, {style}",
    examples: [
      {
        prompt: "professional headshot, business attire, office background",
        emoji: "💼",
      },
      { prompt: "casual portrait, smiling, outdoor park setting", emoji: "😊" },
      {
        prompt: "artistic photo, dramatic lighting, black and white",
        emoji: "🎭",
      },
      {
        prompt: "sitting at a desk, working on laptop, modern office",
        emoji: "💻",
      },
      {
        prompt: "walking in a city street, wearing a jacket, sunny day",
        emoji: "🚶",
      },
    ],
    tips: [
      "Always start with your trigger word",
      "Describe the pose or action clearly",
      "Add setting/background details",
      "Specify photo style or lighting",
    ],
    avoid: [
      "Don't use other people's names",
      "Avoid conflicting identity descriptions",
      "Keep poses physically realistic",
    ],
  },
  pet: {
    title: "Pet Model Prompting",
    description: "Your model learned your pet's unique features",
    structure: "{trigger}, {pose/action}, {setting}, {style}",
    examples: [
      {
        prompt: "sitting on a couch, indoor living room, natural lighting",
        emoji: "🛋️",
      },
      { prompt: "lying in grass, outdoor garden, sunny day", emoji: "🌱" },
      { prompt: "playing with a toy, carpet floor, candid photo", emoji: "🎾" },
      { prompt: "sleeping on a bed, cozy bedroom, soft lighting", emoji: "😴" },
      {
        prompt: "running in a park, action shot, motion blur background",
        emoji: "🏃",
      },
    ],
    tips: [
      "Start with your trigger word",
      "Describe natural pet behaviors",
      "Include environment details",
      "Specify photo quality/style",
    ],
    avoid: [
      "Don't change breed characteristics",
      "Avoid impossible poses",
      "Don't add conflicting animal features",
    ],
  },
  object: {
    title: "Object Model Prompting",
    description: "Your model learned a specific object's appearance",
    structure: "{trigger}, {context/use}, {setting}, {style}",
    examples: [
      {
        prompt: "on a wooden table, kitchen setting, product photography",
        emoji: "📸",
      },
      {
        prompt: "being used by a person, outdoor setting, lifestyle photo",
        emoji: "🏞️",
      },
      {
        prompt: "against white background, studio lighting, commercial shot",
        emoji: "💡",
      },
      {
        prompt: "in natural environment, contextual usage, documentary style",
        emoji: "📱",
      },
      {
        prompt: "macro close-up, detailed texture, artistic photography",
        emoji: "🔍",
      },
    ],
    tips: [
      "Always include your trigger word",
      "Show object in realistic contexts",
      "Describe lighting and setting",
      "Specify photography style",
    ],
    avoid: [
      "Don't change core object features",
      "Avoid impossible physics",
      "Don't mix with incompatible objects",
    ],
  },
  style: {
    title: "Art Style Prompting",
    description: "Your model learned visual style characteristics",
    structure: "{trigger}, {subject}, {composition}, {mood}",
    examples: [
      {
        prompt: "a person working at computer, office scene, professional mood",
        emoji: "💼",
      },
      {
        prompt: "a team meeting, conference room, collaborative atmosphere",
        emoji: "👥",
      },
      {
        prompt:
          "a woman giving presentation, modern workspace, confident energy",
        emoji: "📊",
      },
      {
        prompt: "people collaborating, open office, creative environment",
        emoji: "🎨",
      },
      {
        prompt:
          "business people shaking hands, corporate setting, success theme",
        emoji: "🤝",
      },
    ],
    tips: [
      "Put trigger word first",
      "Describe any subject/scene",
      "Focus on composition",
      "The style will be applied automatically",
    ],
    avoid: [
      "Don't specify conflicting art styles",
      "Avoid overly detailed style descriptions",
      "Let the model handle the visual style",
    ],
  },
};

// Copyright-free artistic styles
const STYLE_PRESETS = [
  {
    id: "none",
    name: "No Style",
    color: "from-gray-500 to-gray-400",
    description: "Generate without applying any specific style",
  },
  {
    id: "abstract-geometric",
    name: "Abstract Geometric",
    color: "from-blue-500 to-purple-400",
    description: "Clean geometric shapes and abstract patterns",
  },
  {
    id: "impressionist",
    name: "Impressionist Style",
    color: "from-yellow-500 to-orange-400",
    description: "Soft brushstrokes and light effects, impressionist technique",
  },
  {
    id: "minimalist",
    name: "Minimalist",
    color: "from-gray-600 to-slate-400",
    description: "Clean, simple composition with minimal elements",
  },
  {
    id: "watercolor",
    name: "Watercolor",
    color: "from-cyan-500 to-blue-400",
    description: "Flowing watercolor painting technique with soft edges",
  },
  {
    id: "vintage-poster",
    name: "Vintage Poster",
    color: "from-red-500 to-yellow-400",
    description: "Retro advertisement poster style with bold colors",
  },
  {
    id: "pencil-sketch",
    name: "Pencil Sketch",
    color: "from-gray-700 to-gray-500",
    description: "Hand-drawn pencil sketch with shading and texture",
  },
];

export default function AIImageGenerator({
  onBack,
  editedImage,
}: AIImageGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("none");
  const [selectedModel, setSelectedModel] = useState<string>("base");
  const [trainedModels, setTrainedModels] = useState<TrainedModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);

  // Debug logging for currentImage changes
  useEffect(() => {
    if (currentImage) {
      console.log(
        "✨ Current image updated:",
        currentImage.id,
        currentImage.prompt.substring(0, 20)
      );
    } else {
      console.log("✨ Current image cleared");
    }
  }, [currentImage]);
  const [steps, setSteps] = useState<number[]>([20]);
  const [guidance, setGuidance] = useState<number[]>([7.5]);
  const [seed, setSeed] = useState<number[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [animatedElements, setAnimatedElements] = useState<AnimatedElement[]>(
    []
  );
  const { saveImageToGallery } = useSaveToGallery();
  const [isSaving, setIsSaving] = useState(false);
  const [recentlySaved, setRecentlySaved] = useState<string | null>(null);
  const { play: playSound } = useSound();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Real auth hook
  const { user, loading: authLoading } = useAuth();
  const {
    generations,
    isGenerating: isAsyncGenerating,
    startGeneration,
  } = useAsyncGeneration();
  const isAnyGenerating = isGenerating || isAsyncGenerating;

  // Load trained models from database
  useEffect(() => {
    const loadModels = async () => {
      if (!user?.id || authLoading) return;

      setIsLoadingModels(true);

      try {
        const response = await fetch(`/api/models?userId=${user.id}`);
        if (response.ok) {
          const models = await response.json();
          setTrainedModels(models);
          console.log(`Loaded ${models.length} trained models`);
        } else {
          console.error("Failed to fetch models:", response.statusText);
          setTrainedModels([]);
        }
      } catch (error) {
        console.error("Failed to load models:", error);
        setTrainedModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadModels();
  }, [user?.id, authLoading]);

  useEffect(() => {
    setIsClient(true);
    setSeed([Math.floor(Math.random() * 1000000)]);

    // Generate animated elements once on client side
    const elements: AnimatedElement[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDelay: Math.random() * 3,
      animationDuration: 2 + Math.random() * 4,
    }));

    setAnimatedElements(elements);

    // Check for edited image returning from editor
    if (typeof window !== "undefined" && sessionStorage) {
      const editedImageReturn = sessionStorage.getItem("editedImageReturn");
      if (editedImageReturn) {
        try {
          const editedImage = JSON.parse(editedImageReturn);
          // Convert the edited image to GeneratedImage format
          const newEditedImage: GeneratedImage = {
            id: editedImage.id,
            prompt: editedImage.prompt,
            style: editedImage.style || "none",
            imageUrl: editedImage.imageUrl,
            timestamp: editedImage.timestamp,
            modelId: editedImage.modelId,
            modelName: editedImage.modelName,
            settings: editedImage.settings || {
              steps: 20,
              guidance: 7.5,
              seed: 0,
            },
          };

          // Add to generated images and set as current
          setGeneratedImages((prev) => [newEditedImage, ...prev]);
          setCurrentImage(newEditedImage);

          // Clear the return data
          sessionStorage.removeItem("editedImageReturn");

          console.log("Edited image loaded successfully");
        } catch (error) {
          console.error("Failed to load edited image:", error);
        }
      }
    }

    // Handle editedImage prop if provided
    if (editedImage) {
      setGeneratedImages((prev) => [editedImage, ...prev]);
      setCurrentImage(editedImage);
    }
  }, [editedImage]);

  // Add this useEffect to handle completed async generations
  useEffect(() => {
    // Find the most recent completed generation that hasn't been processed yet
    const completedGenerations = generations.filter(
      (gen) => gen.status === "completed" && gen.imageUrl
    );

    // Process only new generations (generations array is already ordered by recency)
    const newGenerations = completedGenerations.filter(
      (gen) => !generatedImages.some((img) => img.id === gen.id)
    );

    // Process each new generation
    newGenerations.forEach((gen, index) => {
      // Convert to your existing GeneratedImage format
      const selectedModelData = trainedModels.find(
        (m) => m.id === selectedModel
      );
      const newImage: GeneratedImage = {
        id: gen.id,
        prompt: gen.prompt,
        style: selectedStyle,
        imageUrl: gen.imageUrl || "",
        timestamp: new Date().toISOString(),
        modelId: selectedModel === "base" ? undefined : selectedModel,
        modelName:
          selectedModel === "base"
            ? "Base Model"
            : selectedModelData?.subject_name || "Unknown Model",
        settings: { steps: steps[0], guidance: guidance[0], seed: seed[0] },
      };

      // Add to your existing generated images
      setGeneratedImages((prev) => [newImage, ...prev]);

      // Set as current image (only the first/most recent new generation)
      if (index === 0) {
        setCurrentImage(newImage);
      }
    });
  }, [
    generations,
    selectedStyle,
    selectedModel,
    steps,
    guidance,
    seed,
    trainedModels,
    generatedImages,
  ]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating || !user?.id) {
      return;
    }

    // Check if we should use async (for custom models or production)
    const shouldUseAsync =
      selectedModel !== "base" || process.env.NODE_ENV === "production";

    if (shouldUseAsync) {
      // Use async generation
      try {
        await startGeneration({
          prompt,
          modelId: selectedModel === "base" ? undefined : selectedModel,
          userId: user.id,
          steps: steps[0],
          guidance: guidance[0],
          seed: seed[0],
        });

        // Show success message
        console.log(
          "Generation started! Your image will appear below when ready."
        );
      } catch (error) {
        console.error("Async generation failed:", error);
        alert(
          `Generation failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    } else {
      // Use original sync generation for base model on localhost
      setIsGenerating(true);

      try {
        const result = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            modelId: selectedModel === "base" ? undefined : selectedModel,
            steps: steps[0],
            guidance: guidance[0],
            seed: seed[0],
            userId: user.id,
          }),
        });

        if (!result.ok) {
          const errorData = await result.json();
          throw new Error(errorData.error || "Generation failed");
        }

        const data = await result.json();

        // Handle sync response (has imageUrl directly)
        if (data.imageUrl) {
          const selectedModelData = trainedModels.find(
            (m) => m.id === selectedModel
          );
          const newImage: GeneratedImage = {
            id: Math.random().toString(36).substr(2, 9),
            prompt,
            style: selectedStyle,
            imageUrl: data.imageUrl,
            timestamp: new Date().toISOString(),
            modelId: selectedModel === "base" ? undefined : selectedModel,
            modelName:
              selectedModel === "base"
                ? "Base Model"
                : selectedModelData?.subject_name,
            settings: { steps: steps[0], guidance: guidance[0], seed: seed[0] },
          };

          setGeneratedImages((prev) => [newImage, ...prev]);
          setCurrentImage(newImage);
        }
      } catch (error) {
        console.error("Generation failed:", error);
        alert(
          `Generation failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setIsGenerating(false);
      }
    }
  }, [
    prompt,
    selectedStyle,
    selectedModel,
    steps,
    guidance,
    seed,
    isGenerating,
    trainedModels,
    user?.id,
    startGeneration,
  ]);

  // Handle template selection with trigger word
  const handleTemplateSelect = (example: { prompt: string; emoji: string }) => {
    const selectedModelData = trainedModels.find((m) => m.id === selectedModel);
    let finalPrompt = example.prompt;

    // Add trigger word if using custom model
    if (selectedModelData && selectedModelData.model_version) {
      // Extract trigger word from model_version (assuming format like "username/trigger-word:version")
      const triggerWord =
        selectedModelData.model_version.split("/")[1]?.split(":")[0] ||
        selectedModelData.subject_name.toLowerCase().replace(/\s+/g, "");
      finalPrompt = `${triggerWord}, ${example.prompt}`;
    }

    setPrompt(finalPrompt);
    setIsTemplatesOpen(false);
    textareaRef.current?.focus();
  };

  const randomizeSeed = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 1000000);
    setSeed([newSeed]);
  }, []);

  const copyPrompt = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
  };

  const downloadImage = (imageToDownload: GeneratedImage | null) => {
    if (!imageToDownload) return;
    const link = document.createElement("a");
    link.href = imageToDownload.imageUrl;
    link.download = `ai_image_${imageToDownload.id.substring(0, 6)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const editImage = (imageToEdit: GeneratedImage | null) => {
    if (!imageToEdit) return;

    // Prepare image data for the editor
    const editImageData = {
      id: imageToEdit.id,
      prompt: imageToEdit.prompt,
      style: imageToEdit.style,
      imageUrl: imageToEdit.imageUrl,
      timestamp: imageToEdit.timestamp, // Already a string, editor will convert to Date
      settings: imageToEdit.settings,
      modelId: imageToEdit.modelId,
      modelName: imageToEdit.modelName,
    };

    // Store in sessionStorage for the editor
    if (typeof window !== "undefined" && sessionStorage) {
      sessionStorage.setItem("editImageData", JSON.stringify(editImageData));

      // Navigate to edit page
      window.location.href = "/edit";
    }
  };

  const selectedStyleData = STYLE_PRESETS.find(
    (style) => style.id === selectedStyle
  );
  const selectedModelData = trainedModels.find((m) => m.id === selectedModel);

  // 🔥 NEW: Get prompting guide for selected model
  const promptingGuide =
    selectedModelData && selectedModelData.subject_type
      ? PROMPTING_GUIDES[
          selectedModelData.subject_type as keyof typeof PROMPTING_GUIDES
        ]
      : null;

  // 🔥 NEW: Extract trigger word
  const triggerWord = selectedModelData?.model_version
    ? selectedModelData.model_version.split("/")[1]?.split(":")[0] ||
      selectedModelData.subject_name.toLowerCase().replace(/\s+/g, "")
    : null;

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Simple toast function
  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    console.log(`${type.toUpperCase()}: ${message}`);
    if (typeof window !== "undefined" && "alert" in window) {
      if (type === "error") {
        alert(`Error: ${message}`);
      }
    }
  };

  // Save to gallery function
  const handleSaveToGallery = async (generatedImage: GeneratedImage) => {
    if (!user?.id || !generatedImage.id) {
      showToast("Cannot save: missing user or image data", "error");
      return;
    }

    setIsSaving(true);

    try {
      // For images from the async generation system, use the generation ID directly
      // For sync images, we need to create a generation record first
      let generationId = generatedImage.id;

      // Check if this is a sync-generated image (has a random ID instead of UUID)
      if (generatedImage.id.length < 10 || !generatedImage.id.includes("-")) {
        // Create a generation record first
        const generationResponse = await fetch("/api/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: generatedImage.prompt,
            imageUrl: generatedImage.imageUrl,
            userId: user.id,
            settings: generatedImage.settings,
            isEditedImage: false,
          }),
        });

        if (!generationResponse.ok) {
          throw new Error("Failed to create generation record");
        }

        const generationData = await generationResponse.json();
        generationId = generationData.generationId;
      }

      const result = await saveImageToGallery({
        generationId: generationId,
        userId: user.id,
        title: generatedImage.prompt,
        tags: [generatedImage.style, generatedImage.modelName || "base"].filter(
          Boolean
        ),
        isFavorite: false,
      });

      if (result.success) {
        setRecentlySaved(generationId);
        showToast("Image saved to gallery! 🎨", "success");
        playSound?.("complete");

        // Clear the "recently saved" state after 3 seconds
        setTimeout(() => setRecentlySaved(null), 3000);
      } else {
        throw new Error(result.error || "Failed to save to gallery");
      }
    } catch (error) {
      console.error("Failed to save to gallery:", error);
      showToast("Failed to save image to gallery", "error");
      playSound?.("error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isClient) {
    return null;
  }

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="w-full min-h-screen bg-black p-2 sm:p-4 lg:p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-t-transparent border-cyan-400 rounded-full animate-spin mx-auto"></div>
          <div className="text-cyan-400 font-mono text-xl uppercase tracking-wide">
            Loading Auth...
          </div>
        </div>
      </div>
    );
  }

  // Show auth required message if not authenticated
  if (!user) {
    return (
      <div className="w-full min-h-screen bg-black p-2 sm:p-4 lg:p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-400 font-mono text-xl uppercase tracking-wide">
            🔒 Authentication Required
          </div>
          <div className="text-gray-400 font-mono text-sm">
            Please sign in to use the AI Generator
          </div>
          <button
            onClick={onBack}
            className="bg-blue-900/80 border-2 border-blue-400/50 text-blue-300 hover:bg-blue-800/80 font-mono uppercase tracking-wide backdrop-blur-sm px-4 py-2 rounded-lg"
          >
            ← BACK TO TRAINING
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black p-2 sm:p-4 lg:p-6">
      <div className="bg-gray-900 p-4 sm:p-6 lg:p-8 rounded-lg border-4 border-gray-700 shadow-2xl relative overflow-hidden">
        {/* Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.3) 2px, rgba(0, 255, 0, 0.3) 4px)",
            }}
          />
        </div>

        {/* Animated Particles */}
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

        {/* Header */}
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
              <div className="text-green-400 font-mono text-xs sm:text-sm animate-pulse">
                NEURAL NET ONLINE
              </div>
            </div>
            <button
              onClick={onBack}
              className="bg-blue-900/80 border-2 border-blue-400/50 text-blue-300 hover:bg-blue-800/80 font-mono uppercase tracking-wide backdrop-blur-sm flex items-center gap-2 hover:scale-105 transition-transform text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-md"
            >
              ← BACK TO TRAINING
            </button>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Model Selection */}
            <div className="bg-gradient-to-br from-black/60 via-cyan-900/20 to-blue-900/20 backdrop-blur-sm border-2 border-cyan-400/50 rounded-xl p-4 sm:p-6 shadow-lg shadow-cyan-500/10">
              <h3 className="text-base sm:text-lg font-bold font-mono text-white uppercase tracking-wide mb-2 flex items-center gap-2">
                🧠 SELECT TRAINED AI MODEL
              </h3>
              <div className="text-xs text-gray-400 mb-4">
                Choose which model to use for generation. Train new models in
                the Training section with any images: pets, portraits, logos,
                art styles, products, etc.
              </div>

              {isLoadingModels ? (
                <div className="flex items-center justify-center p-4">
                  <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-cyan-400 font-mono text-sm">
                    Loading your trained models...
                  </span>
                </div>
              ) : trainedModels.length === 0 ? (
                <div className="text-center p-4 bg-yellow-900/20 border border-yellow-400/30 rounded-lg">
                  <div className="text-yellow-400 font-mono text-sm mb-2">
                    🎓 No custom models yet!
                  </div>
                  <div className="text-gray-400 text-xs mb-3">
                    Go to Training to create models with your own images:
                  </div>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div>📸 Upload pet photos → &ldquo;My Dog&rdquo; model</div>
                    <div>
                      🎨 Upload art samples → &ldquo;My Style&rdquo; model
                    </div>
                    <div>👤 Upload portraits → &ldquo;My Face&rdquo; model</div>
                    <div>
                      🏢 Upload brand assets → &ldquo;Company Logo&rdquo; model
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setSelectedModel("base");
                      setPrompt("");
                    }}
                    className={`w-full p-3 rounded-lg border-2 transition-all font-mono text-left ${
                      selectedModel === "base"
                        ? "border-cyan-400 bg-cyan-900/30 text-cyan-300"
                        : "border-gray-600/50 bg-gray-800/50 text-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-gradient-to-r from-gray-500 to-gray-400 rounded-full flex-shrink-0"></div>
                      <div>
                        <div className="text-sm font-bold">
                          🤖 Base Model (FLUX-DEV)
                        </div>
                        <div className="text-xs opacity-75">
                          Standard AI - no custom training applied
                        </div>
                      </div>
                      {selectedModel === "base" && (
                        <div className="ml-auto">⚡</div>
                      )}
                    </div>
                  </button>

                  {trainedModels.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id);
                        // Extract trigger word from model_version
                        const triggerWord = model.model_version
                          ? model.model_version.split("/")[1]?.split(":")[0] ||
                            model.subject_name.toLowerCase().replace(/\s+/g, "")
                          : null;
                        // Set prompt to just the trigger word
                        setPrompt(triggerWord || "");
                      }}
                      className={`w-full p-3 rounded-lg border-2 transition-all font-mono text-left ${
                        selectedModel === model.id
                          ? "border-purple-400 bg-purple-900/30 text-purple-300"
                          : "border-gray-600/50 bg-gray-800/50 text-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-400 rounded-full flex-shrink-0"></div>
                        <div>
                          <div className="text-sm font-bold">
                            ✨ {model.subject_name}
                          </div>
                          <div className="text-xs opacity-75">
                            Custom {model.subject_type} model • Trained:{" "}
                            {new Date(model.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        {selectedModel === model.id && (
                          <div className="ml-auto">⚡</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* 🔥 NEW: Trigger Word Display */}
              {selectedModel !== "base" && selectedModelData && triggerWord && (
                <div className="mt-3 p-3 bg-gradient-to-r from-purple-900/50 to-pink-900/30 border border-purple-400/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-purple-400 font-mono text-sm font-bold">
                      ✨ Using Custom Model: {selectedModelData.subject_name}
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(triggerWord)}
                      className="bg-purple-800/50 border border-purple-400/50 text-purple-300 hover:bg-purple-700/50 font-mono text-xs px-2 py-1 rounded transition-all"
                      title="Copy trigger word"
                    >
                      📋 COPY
                    </button>
                  </div>
                  <div className="text-gray-300 text-xs mb-2">
                    <strong>Trigger Word:</strong>{" "}
                    <span className="bg-black/50 px-2 py-1 rounded font-mono text-yellow-400">
                      {triggerWord}
                    </span>
                  </div>
                  <div className="text-gray-400 text-xs">
                    Always include &ldquo;{triggerWord}&rdquo; in your prompts
                    to activate this model
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Input */}
            <div className="bg-gradient-to-br from-black/60 via-purple-900/20 to-pink-900/20 backdrop-blur-sm border-2 border-purple-400/50 rounded-xl p-4 sm:p-6 shadow-lg shadow-purple-500/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-bold font-mono text-white uppercase tracking-wide flex items-center gap-2">
                  ✨ IMAGINATION INPUT
                </h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs border rounded px-2 py-1 ${
                      prompt.length > 400
                        ? "border-red-400 text-red-400"
                        : prompt.length > 300
                        ? "border-yellow-400 text-yellow-400"
                        : "border-green-400 text-green-400"
                    }`}
                  >
                    {prompt.length}/500
                  </span>
                  <button
                    onClick={copyPrompt}
                    disabled={!prompt}
                    className="bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700 hover:scale-105 transition-transform w-8 h-8 text-xs rounded disabled:opacity-50"
                    title="Copy prompt"
                  >
                    📋
                  </button>
                </div>
              </div>

              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  selectedModel === "base"
                    ? "✨ Describe your artistic vision... mountain landscape, abstract art, still life composition..."
                    : `✨ Start with "${triggerWord}" then describe your scene... ${triggerWord}, sitting in a garden, natural lighting...`
                }
                className="w-full min-h-[100px] sm:min-h-[120px] bg-gray-800/50 border-2 border-purple-400/30 text-white placeholder-gray-400 font-mono resize-none focus:border-purple-400 focus:ring-purple-400/20 focus:ring-4 transition-all text-sm sm:text-base rounded-lg p-3"
                maxLength={500}
              />

              {/* 🔥 NEW: Trigger word warning */}
              {selectedModel !== "base" &&
                triggerWord &&
                !prompt.includes(triggerWord) &&
                prompt.trim() && (
                  <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-400/50 rounded-lg">
                    <div className="text-yellow-400 font-mono text-xs flex items-center gap-2">
                      ⚠️ Don&apos;t forget to include &ldquo;{triggerWord}
                      &rdquo; in your prompt!
                    </div>
                  </div>
                )}

              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
                  className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-2 border-purple-400/50 text-purple-300 hover:bg-purple-800/50 font-mono text-xs hover:scale-105 transition-transform px-3 py-2 rounded-lg"
                >
                  {promptingGuide
                    ? `💡 ${promptingGuide.title.toUpperCase()}`
                    : "💡 ART TEMPLATES"}
                </button>
              </div>

              {/* 🔥 REPLACED: Dynamic Prompting Guide */}
              {isTemplatesOpen && (
                <div className="mt-4">
                  <div className="bg-gradient-to-br from-gray-800/50 to-purple-800/30 border-2 border-purple-400/30 rounded-lg p-3 sm:p-4 backdrop-blur-sm">
                    {promptingGuide ? (
                      <>
                        <h4 className="text-xs sm:text-sm font-mono text-purple-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                          ✨ {promptingGuide.title}
                        </h4>

                        <div className="mb-4 p-3 bg-black/30 rounded-lg border border-purple-400/20">
                          <div className="text-xs text-cyan-400 font-mono mb-1">
                            📋 STRUCTURE:
                          </div>
                          <div className="text-xs text-white font-mono bg-gray-800/50 p-2 rounded">
                            {promptingGuide.structure}
                          </div>
                        </div>

                        <div className="max-h-48 sm:max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800/50 [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500 [&::-webkit-scrollbar-thumb]:to-pink-500 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:from-purple-400 [&::-webkit-scrollbar-thumb:hover]:to-pink-400 [&::-webkit-scrollbar]:border-l [&::-webkit-scrollbar]:border-purple-500/20">
                          <div className="grid grid-cols-1 gap-2 mb-4">
                            <div className="text-xs text-green-400 font-mono mb-2">
                              ✅ EXAMPLE PROMPTS:
                            </div>
                            {promptingGuide.examples.map((example, index) => (
                              <button
                                key={index}
                                onClick={() => handleTemplateSelect(example)}
                                className="text-left p-3 bg-gradient-to-br from-gray-700/50 to-gray-600/30 hover:from-purple-700/50 hover:to-pink-700/30 border-2 border-gray-600/30 hover:border-purple-400/50 rounded-lg transition-all group hover:shadow-lg hover:shadow-purple-500/20"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-base flex-shrink-0">
                                    {example.emoji}
                                  </span>
                                  <div className="text-xs text-purple-400 font-mono break-words">
                                    {triggerWord && `${triggerWord}, `}
                                    {example.prompt}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <div className="text-green-400 font-mono mb-2">
                                ✅ BEST PRACTICES:
                              </div>
                              <ul className="space-y-1">
                                {promptingGuide.tips.map((tip, index) => (
                                  <li
                                    key={index}
                                    className="text-gray-300 flex items-start gap-1"
                                  >
                                    <span className="text-green-400">•</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <div className="text-red-400 font-mono mb-2">
                                ❌ AVOID:
                              </div>
                              <ul className="space-y-1">
                                {promptingGuide.avoid.map((avoid, index) => (
                                  <li
                                    key={index}
                                    className="text-gray-400 flex items-start gap-1"
                                  >
                                    <span className="text-red-400">•</span>
                                    {avoid}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <h4 className="text-xs sm:text-sm font-mono text-purple-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                          ✨ GENERAL ART TEMPLATES
                        </h4>
                        <div className="max-h-48 sm:max-h-60 overflow-y-auto">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                            {[
                              {
                                prompt:
                                  "Serene mountain landscape with rolling hills, clear sky, and natural lighting",
                                emoji: "🏔️",
                              },
                              {
                                prompt:
                                  "Abstract geometric composition with flowing shapes and vibrant colors",
                                emoji: "🎨",
                              },
                              {
                                prompt:
                                  "Simple still life arrangement with fruits, pottery, and natural lighting",
                                emoji: "🍎",
                              },
                              {
                                prompt:
                                  "Peaceful forest clearing with tall trees, dappled sunlight, and moss-covered ground",
                                emoji: "🌲",
                              },
                              {
                                prompt:
                                  "Modern architectural building with clean lines, glass surfaces, and geometric design",
                                emoji: "🏢",
                              },
                              {
                                prompt:
                                  "Dynamic ocean waves crashing against rocky coastline with dramatic sky",
                                emoji: "🌊",
                              },
                            ].map((template, index) => (
                              <button
                                key={index}
                                onClick={() => handleTemplateSelect(template)}
                                className="text-left p-3 bg-gradient-to-br from-gray-700/50 to-gray-600/30 hover:from-purple-700/50 hover:to-pink-700/30 border-2 border-gray-600/30 hover:border-purple-400/50 rounded-lg transition-all group hover:shadow-lg hover:shadow-purple-500/20"
                              >
                                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                  <span className="text-base sm:text-lg">
                                    {template.emoji}
                                  </span>
                                  <div className="text-xs text-purple-400 font-mono uppercase">
                                    General
                                  </div>
                                </div>
                                <div className="text-xs text-gray-400 line-clamp-2">
                                  {template.prompt}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Artistic Style */}
            <div className="bg-gradient-to-br from-black/60 via-pink-900/20 to-purple-900/20 backdrop-blur-sm border-2 border-pink-400/50 rounded-xl p-4 sm:p-6 shadow-lg shadow-pink-500/10">
              <h3 className="text-base sm:text-lg font-bold font-mono text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                🎨 ARTISTIC STYLE (OPTIONAL)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
                {STYLE_PRESETS.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                      selectedStyle === style.id
                        ? `border-white bg-gradient-to-br ${style.color} shadow-lg`
                        : "border-gray-600/50 bg-gray-800/50 hover:border-gray-400"
                    }`}
                  >
                    <div className="text-center space-y-1 sm:space-y-2">
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-lg border-2 ${
                          selectedStyle === style.id
                            ? "border-white"
                            : "border-gray-600"
                        } bg-gradient-to-br ${
                          style.color
                        } flex items-center justify-center`}
                      />
                      <div
                        className={`text-xs font-mono font-bold uppercase tracking-wide ${
                          selectedStyle === style.id
                            ? "text-white"
                            : "text-gray-300"
                        }`}
                      >
                        {style.name}
                      </div>
                      <div
                        className={`hidden sm:block text-xs ${
                          selectedStyle === style.id
                            ? "text-gray-200"
                            : "text-gray-500"
                        }`}
                      >
                        {style.description}
                      </div>
                    </div>
                    {selectedStyle === style.id && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full flex items-center justify-center shadow-md text-xs">
                        ⚡
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
                  <div className="text-gray-200 text-xs mt-1">
                    {selectedStyleData.description}
                  </div>
                </div>
              )}
            </div>

            {/* Generation Parameters */}
            <div className="bg-gradient-to-br from-black/60 via-cyan-900/20 to-blue-900/20 backdrop-blur-sm border-2 border-cyan-400/50 rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-lg shadow-cyan-500/10">
              <h3 className="text-base sm:text-lg font-bold font-mono text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                ⚙️ NEURAL PARAMETERS
              </h3>

              <div>
                <label className="text-xs sm:text-sm font-mono text-white uppercase tracking-wide mb-2 block flex items-center gap-2">
                  ⚡ INFERENCE STEPS: {steps[0]}
                  <span
                    className={`text-xs px-2 py-1 rounded border ${
                      steps[0] < 15
                        ? "bg-yellow-400/20 text-yellow-400 border-yellow-400/50"
                        : steps[0] < 30
                        ? "bg-green-400/20 text-green-400 border-green-400/50"
                        : "bg-blue-400/20 text-blue-400 border-blue-400/50"
                    }`}
                  >
                    {steps[0] < 15
                      ? "FAST"
                      : steps[0] < 30
                      ? "BALANCED"
                      : "QUALITY"}
                  </span>
                </label>
                <div className="text-xs text-gray-400 mb-2">
                  How many denoising steps the AI takes. More steps = higher
                  quality but slower generation.
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="1"
                  value={steps[0]}
                  onChange={(e) => setSteps([parseInt(e.target.value)])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 font-mono mt-1">
                  <span>⚡ FAST (10) - 30s</span>
                  <span>🎯 QUALITY (50) - 2min</span>
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-mono text-white uppercase tracking-wide mb-2 block flex items-center gap-2">
                  🎯 GUIDANCE SCALE: {guidance[0]}
                  <span
                    className={`text-xs px-2 py-1 rounded border ${
                      guidance[0] < 5
                        ? "bg-purple-400/20 text-purple-400 border-purple-400/50"
                        : guidance[0] < 12
                        ? "bg-green-400/20 text-green-400 border-green-400/50"
                        : "bg-blue-400/20 text-blue-400 border-blue-400/50"
                    }`}
                  >
                    {guidance[0] < 5
                      ? "CREATIVE"
                      : guidance[0] < 12
                      ? "BALANCED"
                      : "PRECISE"}
                  </span>
                </label>
                <div className="text-xs text-gray-400 mb-2">
                  How closely the AI follows your prompt. Lower = more
                  creative/artistic, Higher = more literal/precise.
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={guidance[0]}
                  onChange={(e) => setGuidance([parseFloat(e.target.value)])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 font-mono mt-1">
                  <span>🎨 CREATIVE (1) - Artistic interpretation</span>
                  <span>🎯 PRECISE (20) - Exact prompt following</span>
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-mono text-white uppercase tracking-wide mb-2 block flex items-center gap-2">
                  🎲 RANDOM SEED
                </label>
                <div className="text-xs text-gray-400 mb-2">
                  Controls randomness. Same seed + same prompt = identical
                  results. Leave random for variety.
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={seed[0]}
                    onChange={(e) => setSeed([parseInt(e.target.value) || 0])}
                    className="flex-1 bg-gray-800/50 border-2 border-green-400/30 text-white font-mono focus:border-green-400 focus:ring-green-400/20 text-sm sm:text-base rounded-lg p-2"
                    placeholder="Random number..."
                  />
                  <button
                    onClick={randomizeSeed}
                    className="bg-gradient-to-r from-yellow-900/50 to-green-900/50 border-2 border-yellow-400/50 text-yellow-300 hover:bg-yellow-800/50 font-mono hover:scale-105 transition-transform px-3 rounded-lg"
                    title="Generate new random seed"
                  >
                    🎲
                  </button>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isAnyGenerating}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 hover:from-purple-500 hover:via-pink-400 hover:to-cyan-400 text-white font-bold font-mono uppercase tracking-wider py-4 sm:py-6 text-lg sm:text-2xl border-2 sm:border-4 border-white/20 shadow-2xl shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-300 relative overflow-hidden rounded-lg"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-2 sm:gap-4">
                  <div className="w-5 h-5 sm:w-8 sm:h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="animate-pulse">CREATING MAGIC...</span>
                  <span className="hidden sm:block animate-bounce">✨</span>
                </div>
              ) : isAsyncGenerating ? (
                <div className="flex items-center justify-center gap-2 sm:gap-4">
                  <div className="w-5 h-5 sm:w-8 sm:h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="animate-pulse">AI WORKING...</span>
                  <span className="hidden sm:block animate-bounce">🤖</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 sm:gap-4">
                  <span className="animate-pulse">⚡</span>
                  <span>UNLEASH CREATIVITY</span>
                  <span className="hidden sm:block animate-bounce">🎨</span>
                </div>
              )}
            </button>

            {/* Active Generations Status */}
            {generations.filter((gen) => gen.status === "generating").length >
              0 && (
              <div className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-2 border-yellow-400/50 rounded-lg p-3 mt-4">
                <h4 className="text-yellow-300 font-mono text-sm font-bold mb-2 flex items-center gap-2">
                  🔄 ACTIVE GENERATIONS
                </h4>
                <div className="space-y-2">
                  {generations
                    .filter((gen) => gen.status === "generating")
                    .map((gen) => (
                      <div
                        key={gen.id}
                        className="flex items-center justify-between bg-black/30 rounded p-2"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                          <span className="text-yellow-300 font-mono text-xs truncate">
                            {gen.prompt.substring(0, 40)}...
                          </span>
                        </div>
                        <span className="text-yellow-400 font-mono text-xs flex-shrink-0">
                          {gen.estimatedTime || "Processing..."}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Image Preview */}
          <div className="lg:fixed lg:right-8 lg:w-[calc(33.333%-2rem)] lg:top-32 lg:bottom-6 lg:overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800/50 [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500 [&::-webkit-scrollbar-thumb]:to-pink-500 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:from-purple-400 [&::-webkit-scrollbar-thumb:hover]:to-pink-400 [&::-webkit-scrollbar]:border-l [&::-webkit-scrollbar]:border-purple-500/20">
            <div className="space-y-6 pr-2">
              <div className="bg-gradient-to-br from-black/60 via-purple-900/20 to-pink-900/20 backdrop-blur-sm border-2 border-purple-400/50 rounded-xl p-4 sm:p-6 shadow-lg shadow-purple-500/10">
                <h3 className="text-base sm:text-lg font-bold font-mono text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                  ✨ MASTERPIECE PREVIEW
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
                        🎨 PROMPT
                      </div>
                      <div className="text-xs sm:text-sm text-white font-mono bg-gradient-to-r from-gray-800/50 to-purple-800/30 p-2 sm:p-3 rounded-lg border border-purple-400/30">
                        {currentImage.prompt}
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 font-mono">
                        <span className="flex items-center gap-1">
                          🧠 {currentImage.modelName || "Base Model"}
                        </span>
                        <span className="flex items-center gap-1">
                          🎲 {currentImage.settings.seed || "Random"}
                        </span>
                      </div>
                      <div className="text-xs text-cyan-400 font-mono flex items-center gap-1">
                        <span>🕐</span>
                        {formatTimestamp(currentImage.timestamp)}
                      </div>
                      <div className="bg-purple-900/30 border border-purple-400/30 rounded-lg p-2 mb-3">
                        <div className="text-purple-400 font-mono text-xs mb-1 flex items-center gap-1">
                          ✏️ EDIT OPTIONS
                        </div>
                        <div className="text-gray-300 text-xs">
                          • Inpaint: Fill/replace areas
                          <br />
                          • Add: hats, glasses, objects
                          <br />
                          • Change: colors, backgrounds
                          <br />• Pose preservation with ControlNet
                        </div>
                      </div>
                      <button
                        onClick={() => editImage(currentImage)}
                        className="w-full bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-2 border-purple-400/50 text-purple-300 hover:bg-purple-800/50 font-mono hover:scale-105 transition-transform text-xs sm:text-sm py-2 rounded-lg mb-2"
                      >
                        ✏️ EDIT IMAGE
                      </button>
                      <button
                        onClick={() => downloadImage(currentImage)}
                        className="w-full bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-2 border-green-400/50 text-green-300 hover:bg-green-800/50 font-mono hover:scale-105 transition-transform text-xs sm:text-sm py-2 rounded-lg"
                      >
                        💾 DOWNLOAD MASTERPIECE
                      </button>
                      <Button
                        onClick={() => handleSaveToGallery(currentImage)}
                        disabled={isSaving}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 font-mono text-sm py-4 uppercase tracking-wide disabled:opacity-50"
                      >
                        {isSaving ? (
                          <div className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            SAVING...
                          </div>
                        ) : recentlySaved ? (
                          <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4 text-red-400 fill-current" />
                            SAVED TO GALLERY!
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            SAVE TO GALLERY
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-gray-800/50 to-purple-800/30 rounded-lg border-2 sm:border-4 border-dashed border-purple-400/50 flex items-center justify-center">
                    <div className="text-center text-gray-500 font-mono p-4">
                      <div className="text-4xl mb-3 opacity-50 animate-pulse">
                        🎨
                      </div>
                      <div className="text-sm sm:text-lg uppercase mb-1 sm:mb-2">
                        Ready to Create
                      </div>
                      <div className="text-xs sm:text-sm">
                        Your next masterpiece awaits...
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Generations */}
              {generatedImages.length > 0 && (
                <div className="bg-gradient-to-br from-black/60 via-blue-900/20 to-cyan-900/20 backdrop-blur-sm border-2 border-cyan-400/50 rounded-xl p-4 sm:p-6 shadow-lg shadow-cyan-500/10">
                  <h3 className="text-base sm:text-lg font-bold font-mono text-white uppercase tracking-wide mb-4 flex items-center gap-2">
                    📚 CREATION ARCHIVE
                  </h3>

                  <div className="max-h-56 sm:max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800/50 [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-500 [&::-webkit-scrollbar-thumb]:to-pink-500 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:from-purple-400 [&::-webkit-scrollbar-thumb:hover]:to-pink-400 [&::-webkit-scrollbar]:border-l [&::-webkit-scrollbar]:border-purple-500/20">
                    <div className="space-y-2 sm:space-y-3">
                      {generatedImages.map((image, index) => (
                        <button
                          key={image.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log(
                              "🖼️ Archive image clicked:",
                              image.id,
                              image.prompt.substring(0, 20)
                            );
                            setCurrentImage(image);
                          }}
                          className="w-full p-2 sm:p-3 bg-gradient-to-r from-gray-800/50 to-cyan-800/30 hover:from-cyan-700/50 hover:to-blue-700/30 border-2 border-gray-600/30 hover:border-cyan-400/50 rounded-lg transition-all text-left group"
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
                                🕐 {formatTimestamp(image.timestamp)}
                              </div>
                              <div className="text-xs sm:text-sm text-white font-mono truncate">
                                {image.prompt}
                              </div>
                              <div className="text-xs text-purple-400 font-mono flex items-center gap-1">
                                🧠 {image.modelName || "Base Model"}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

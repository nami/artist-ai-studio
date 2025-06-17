"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  ArrowLeft,
  Brush,
  Eraser,
  Wand2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Upload,
  Eye,
  Sparkles,
  Palette,
  Settings,
  RefreshCw,
  Check,
  X,
  Info,
  Cpu,
  Volume2,
  VolumeX,
  Target,
  Clock,
  Shuffle,
  Save,
  Heart,
} from "lucide-react";

// Import only the essential UI components
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useSaveToGallery } from "@/utils/gallery-storage"

type Tool = "brush" | "eraser" | "magic" | "rectangle";
type EditMode = "inpaint" | "outpaint" | "replace";

interface ImageData {
  id: string;
  prompt: string;
  style: string;
  imageUrl: string;
  timestamp: Date;
  settings: {
    steps: number;
    guidance: number;
    seed: number;
  };
}

interface ImageEditorProps {
  onBack?: () => void;
}

interface AnimatedElement {
  id: number;
  left: number;
  top: number;
  animationDelay: number;
  animationDuration: number;
}

const QUICK_PROMPTS = {
  add: [
    "add a red ribbon",
    "add sunglasses",
    "add a hat",
    "add jewelry",
    "add flowers",
    "add a bow tie",
  ],
  change: [
    "change to blue color",
    "make it golden",
    "change the background",
    "make it sparkly",
    "change to winter scene",
    "make it vintage style",
  ],
};

export default function AIImageEditor({ onBack }: ImageEditorProps) {
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);

  // Image data from generator
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(
    null
  );
  const [imageUrl, setImageUrl] = useState<string>("");

  // Client-side rendering state
  const [isClient, setIsClient] = useState(false);
  const [animatedElements, setAnimatedElements] = useState<AnimatedElement[]>(
    []
  );

  // State
  const [tool, setTool] = useState<Tool>("brush");
  const [editMode, setEditMode] = useState<EditMode>("inpaint");
  const [brushSize, setBrushSize] = useState(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showMask, setShowMask] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState(
    "blurry, low quality, distorted"
  );
  const [isMuted, setIsMuted] = useState(false);

  // ControlNet options
  const [useControlNet, setUseControlNet] = useState(true);
  const [preservePose, setPreservePose] = useState(true);
  const [controlStrength, setControlStrength] = useState(80);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Better editing workflow state
  const [editHistory, setEditHistory] = useState<string[]>([]);
  const [currentEditIndex, setCurrentEditIndex] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 🔥 FIX 1: Store original canvas dimensions
  const [canvasDimensions, setCanvasDimensions] = useState<{
    width: number;
    height: number;
    ratio: number;
  } | null>(null);

  const { saveImageToGallery } = useSaveToGallery()
  const [isSaving, setIsSaving] = useState(false)
  const [recentlySaved, setRecentlySaved] = useState<string | null>(null)

  // Simple toast function for user feedback
  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    if (typeof window !== "undefined" && "alert" in window) {
      if (type === "error") {
        alert(`Error: ${message}`);
      }
    }
  };

  // Format timestamps for display
  const formatTimestamp = (timestamp: Date | string) => {
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return date.toLocaleTimeString();
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Invalid time";
    }
  };

  // Initialize client-side rendering and animated background elements
  useEffect(() => {
    setIsClient(true);

    const animationTimer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const elements: AnimatedElement[] = Array.from(
          { length: 15 },
          (_, i) => ({
            id: i,
            left: Math.random() * 100,
            top: Math.random() * 100,
            animationDelay: Math.random() * 3,
            animationDuration: 2 + Math.random() * 4,
          })
        );

        setAnimatedElements(elements);
      }
    }, 150);

    return () => clearTimeout(animationTimer);
  }, []);

  // Load and initialize image data from session storage
  useEffect(() => {
    if (!isClient) return;

    try {
      const storedData = sessionStorage?.getItem("editImageData");
      if (storedData) {
        const rawImageData = JSON.parse(storedData);
        const imageData: ImageData = {
          ...rawImageData,
          timestamp: new Date(rawImageData.timestamp),
        };

        setOriginalImageData(imageData);
        setImageUrl(imageData.imageUrl);

        setEditHistory([imageData.imageUrl]);
        setCurrentEditIndex(0);

        setPrompt("");

        showToast(
          `Image loaded for editing: '${imageData.prompt.substring(0, 30)}...'`,
          "success"
        );
        sessionStorage?.removeItem("editImageData");
      } else {
        const placeholderUrl = "https://picsum.photos/800/600";
        setImageUrl(placeholderUrl);
        setEditHistory([placeholderUrl]);
        setCurrentEditIndex(0);
        showToast("No image data found, using placeholder for demo", "info");
      }
    } catch (error) {
      console.error("Error loading image data:", error);
      const fallbackUrl = "https://picsum.photos/800/600";
      setImageUrl(fallbackUrl);
      setEditHistory([fallbackUrl]);
      setCurrentEditIndex(0);
      showToast("Failed to load image data", "error");
    }
  }, [isClient]);

  // Initialize canvas with proper sizing and dimensions
  useEffect(() => {
    if (!canvasRef.current || !maskCanvasRef.current || !imageUrl || !isClient)
      return;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current!;
      const maskCanvas = maskCanvasRef.current!;
      const ctx = canvas.getContext("2d")!;

      // Get container dimensions for proper scaling
      const canvasContainer = canvas.closest(".xl\\:col-span-2");
      const containerRect = canvasContainer?.getBoundingClientRect();

      // Calculate available space with padding
      const availableWidth = containerRect?.width || window.innerWidth * 0.5;
      const availableHeight = window.innerHeight * 0.6;

      // Calculate maximum dimensions with padding
      const maxWidth = Math.max(300, availableWidth - 40);
      const maxHeight = Math.max(300, availableHeight - 60);

      // Calculate scale ratio to fit within container
      const scaleX = maxWidth / img.width;
      const scaleY = maxHeight / img.height;
      const ratio = Math.min(scaleX, scaleY);

      // Ensure minimum scale ratio
      const finalRatio = Math.max(ratio, 0.3);

      // Cap maximum canvas size
      const maxCanvasSize = 800;
      const width = Math.min(maxCanvasSize, Math.round(img.width * finalRatio));
      const height = Math.min(
        maxCanvasSize,
        Math.round(img.height * finalRatio)
      );

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      maskCanvas.width = width;
      maskCanvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      maskCanvas.style.width = `${width}px`;
      maskCanvas.style.height = `${height}px`;

      // Store dimensions for later use
      setCanvasDimensions({
        width,
        height,
        ratio: finalRatio,
      });

      // Draw image at calculated size
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
    };

    img.onerror = (error: Event | string) => {
      console.error("Failed to load image for canvas:", error);
      showToast("Failed to load image", "error");
    };

    img.src = imageUrl;
  }, [imageUrl, isClient]);

  // Drawing functions for mask creation
  const startDrawing = useCallback(
    (e: React.MouseEvent) => {
      if (!maskCanvasRef.current) return;

      const canvas = maskCanvasRef.current;
      const rect = canvas.getBoundingClientRect();

      // Calculate mouse position relative to canvas
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setIsDrawing(true);

      const ctx = canvas.getContext("2d")!;

      // Set drawing style based on tool
      ctx.globalCompositeOperation =
        tool === "eraser" ? "destination-out" : "source-over";
      ctx.fillStyle = "rgba(255, 0, 255, 0.8)";
      ctx.strokeStyle = "rgba(255, 0, 255, 0.8)";
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Draw initial point
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [tool, brushSize]
  );

  const draw = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing || !maskCanvasRef.current) return;

      const canvas = maskCanvasRef.current;
      const rect = canvas.getBoundingClientRect();

      // Calculate mouse position relative to canvas
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ctx = canvas.getContext("2d")!;
      ctx.lineTo(x, y);
      ctx.stroke();

      // Draw point at current position
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [isDrawing, brushSize]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearMask = useCallback(() => {
    if (!maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext("2d")!;
    ctx.clearRect(
      0,
      0,
      maskCanvasRef.current.width,
      maskCanvasRef.current.height
    );
  }, []);

  // Validate and provide feedback for edit prompts
  const validatePrompt = (
    promptText: string
  ): { isValid: boolean; message?: string } => {
    const cleaned = promptText.trim();

    if (!cleaned) {
      return {
        isValid: false,
        message: "Please describe what you want to change",
      };
    }

    if (cleaned.length < 3) {
      return {
        isValid: false,
        message: "Please be more specific in your description",
      };
    }

    if (cleaned.toLowerCase().includes("edit this")) {
      return {
        isValid: false,
        message:
          'Remove "edit this" - just describe the change: add red ribbon around neck',
      };
    }

    if (cleaned.toLowerCase().match(/^(edit|change|modify)\s*:?\s*$/i)) {
      return {
        isValid: false,
        message: "Be more specific: describe what to add, change, or modify",
      };
    }

    if (cleaned.toLowerCase().match(/^(something|anything|stuff|things?)$/i)) {
      return {
        isValid: false,
        message:
          "Be specific about what you want: add hat, change color to blue, etc.",
      };
    }

    if (cleaned.length > 200) {
      return {
        isValid: false,
        message:
          "Prompt is too long. Keep it under 200 characters for better results.",
      };
    }

    return { isValid: true };
  };

  // Handle quick prompt selection and prevent duplicates
  const handleQuickPrompt = (quickPrompt: string) => {
    const currentPrompt = prompt.trim();

    if (currentPrompt.toLowerCase().includes(quickPrompt.toLowerCase())) {
      showToast(`'${quickPrompt}' is already in your prompt`, "info");
      return;
    }

    if (!currentPrompt) {
      setPrompt(quickPrompt);
    } else {
      setPrompt(`${currentPrompt}, ${quickPrompt}`);
    }

    showToast(`Added: '${quickPrompt}'`, "success");
  };

  // Handle reference image upload for ControlNet
  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setReferenceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Enhance mask edges for better blending
  const refineMask = useCallback(() => {
    if (!maskCanvasRef.current) return;

    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Increase opacity of masked pixels for better blending
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        data[i + 3] = Math.min(255, data[i + 3] * 1.1);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    showToast("Mask refined for better blending", "info");
  }, []);

  // Preview masked area with highlight effect
  const previewMaskArea = useCallback(() => {
    if (!maskCanvasRef.current || !canvasRef.current) return;

    const maskCanvas = maskCanvasRef.current;
    const mainCanvas = canvasRef.current;
    const maskCtx = maskCanvas.getContext("2d")!;
    const mainCtx = mainCanvas.getContext("2d")!;

    // Get original image and mask data
    const originalImageData = mainCtx.getImageData(
      0,
      0,
      mainCanvas.width,
      mainCanvas.height
    );
    const maskData = maskCtx.getImageData(
      0,
      0,
      maskCanvas.width,
      maskCanvas.height
    );

    // Create preview with highlighted mask area
    const previewImageData = new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width,
      originalImageData.height
    );

    // Apply blue highlight to masked areas
    for (let i = 0; i < previewImageData.data.length; i += 4) {
      const maskAlpha = maskData.data[i + 3];
      if (maskAlpha > 0) {
        previewImageData.data[i] = Math.min(
          255,
          previewImageData.data[i] * 0.3
        );
        previewImageData.data[i + 1] = Math.min(
          255,
          previewImageData.data[i + 1] * 0.3
        );
        previewImageData.data[i + 2] = Math.min(
          255,
          previewImageData.data[i + 2] * 0.3 + 200
        );
      }
    }

    // Show preview and restore original after 3 seconds
    mainCtx.putImageData(previewImageData, 0, 0);
    setTimeout(() => {
      if (imageUrl) {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
          mainCtx.drawImage(img, 0, 0, mainCanvas.width, mainCanvas.height);
        };
        img.src = imageUrl;
      }
    }, 3000);

    showToast("Highlighted masked area for 3 seconds", "info");
  }, [imageUrl]);

  // Show random mask precision tip
  const showMaskTips = () => {
    const tips = [
      "🎯 Draw directly over what you want to change",
      "🔍 Use a smaller brush for precise areas like jewelry",
      "📝 Be specific: red ribbon around neck not just ribbon",
      "👁️ Use Preview to see exactly what's masked",
      "⭕ Smaller masks = more precise results",
    ];

    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    showToast(randomTip, "info");
  };

  // Process edit with AI and handle response
  const processEdit = async () => {
    const validation = validatePrompt(prompt);
    if (!validation.isValid) {
      showToast(validation.message!, "error");
      return;
    }

    if (!maskCanvasRef.current) {
      showToast("Please select an area to edit", "error");
      return;
    }

    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext("2d")!;
    const imageData = maskCtx.getImageData(
      0,
      0,
      maskCanvas.width,
      maskCanvas.height
    );
    const hasContent = Array.from(imageData.data).some(
      (pixel, index) => index % 4 === 3 && pixel > 0
    );

    if (!hasContent) {
      showToast("Please draw a mask over the area you want to edit", "error");
      return;
    }

    setIsProcessing(true);
    showToast("Processing precise edit...", "info");

    try {
      const maskBlob = await new Promise<Blob>((resolve) => {
        maskCanvas.toBlob((blob) => {
          resolve(blob!);
        }, "image/png");
      });

      const cleanPrompt = prompt.trim();

      const formData = new FormData();
      formData.append("imageUrl", editHistory[currentEditIndex]);
      formData.append("mask", maskBlob, "mask.png");
      formData.append("prompt", cleanPrompt);
      formData.append("preservePose", preservePose.toString());

      const response = await fetch("/api/inpaint", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Edit failed");
      }

      const data = await response.json();

      // Validate and set result
      const resultImageUrl = data.imageUrl;
      if (!resultImageUrl || !resultImageUrl.startsWith("http")) {
        throw new Error(`Invalid image URL: ${resultImageUrl}`);
      }

      setResult(resultImageUrl);
      setTimeout(() => {
        setShowComparison(true);
        setHasUnsavedChanges(true);
      }, 100);

      if (data.imageUrl === editHistory[currentEditIndex]) {
        showToast(
          "⚠️ The AI returned the same image. Try a more specific prompt or larger mask area.",
          "info"
        );
      }

      showToast(
        "Edit completed! Review the result and choose to accept or try again.",
        "success"
      );
    } catch (error) {
      console.error("Edit failed:", error);
      showToast(
        `Edit failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Redraw canvas with preserved dimensions
  const redrawCanvas = useCallback(() => {
    if (!canvasRef.current || !imageUrl || !isClient || !canvasDimensions) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    // Maintain original dimensions
    canvas.width = canvasDimensions.width;
    canvas.height = canvasDimensions.height;
    canvas.style.width = `${canvasDimensions.width}px`;
    canvas.style.height = `${canvasDimensions.height}px`;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
      ctx.drawImage(img, 0, 0, canvasDimensions.width, canvasDimensions.height);
    };
    img.onerror = (error) => {
      console.error("❌ Failed to redraw canvas:", error);
    };
    img.src = imageUrl;
  }, [imageUrl, isClient, canvasDimensions]);

  // Reject edit and restore previous state
  const rejectEdit = () => {
    if (!result) {
      showToast("No edit result to reject", "error");
      return;
    }

    // Clear edit states
    setResult(null);
    setShowComparison(false);
    setHasUnsavedChanges(false);

    // Redraw canvas with proper dimensions
    setTimeout(() => {
      if (canvasDimensions) {
        redrawCanvas();
      } else {
        // Force canvas reinitialization
        const currentImageUrl = imageUrl;
        setImageUrl("");
        setTimeout(() => {
          setImageUrl(currentImageUrl);
        }, 50);
      }
    }, 100);

    showToast(
      "Edit rejected. The image remains unchanged. Adjust your mask or prompt and try again.",
      "success"
    );
  };

  // Maintain mask canvas dimensions
  useEffect(() => {
    if (
      !showComparison &&
      !result &&
      imageUrl &&
      canvasDimensions &&
      maskCanvasRef.current
    ) {
      const maskCanvas = maskCanvasRef.current;
      maskCanvas.width = canvasDimensions.width;
      maskCanvas.height = canvasDimensions.height;
      maskCanvas.style.width = `${canvasDimensions.width}px`;
      maskCanvas.style.height = `${canvasDimensions.height}px`;
    }
  }, [showComparison, result, imageUrl, canvasDimensions]);

  // Log canvas state for debugging
  useEffect(() => {
    if (result) {
      console.log("🔍 Canvas state:", {
        imageUrl: !!imageUrl,
        canvasReady: !!canvasRef.current,
        currentSize: canvasRef.current?.width
          ? `${canvasRef.current.width}×${canvasRef.current.height}`
          : "❌ Missing",
        storedDimensions: canvasDimensions
          ? `${canvasDimensions.width}×${canvasDimensions.height}`
          : "❌ None",
        scaleRatio: canvasDimensions
          ? `${Math.round(canvasDimensions.ratio * 100)}%`
          : "❌ Unknown",
        comparisonMode: showComparison ? "✅ Active" : "❌ Inactive",
      });
    }
  }, [result, imageUrl, showComparison, canvasDimensions]);

  // Check canvas content and redraw if empty
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d")!;
      const imageData = ctx.getImageData(
        0,
        0,
        Math.min(10, canvas.width),
        Math.min(10, canvas.height)
      );
      const hasContent = imageData.data.some((pixel) => pixel > 0);

      if (!hasContent) {
        console.warn("⚠️ Canvas appears empty, attempting redraw...");
        redrawCanvas();
      }
    }
  }, [redrawCanvas]);

  // Undo to previous version
  const undoEdit = () => {
    if (currentEditIndex > 0) {
      const newIndex = currentEditIndex - 1;
      setCurrentEditIndex(newIndex);
      setImageUrl(editHistory[newIndex]);
      setResult(null);
      setShowComparison(false);
      setHasUnsavedChanges(false);
      clearMask();

      showToast("Undid last edit", "success");
    }
  };

  // Redo to next version
  const redoEdit = () => {
    if (currentEditIndex < editHistory.length - 1) {
      const newIndex = currentEditIndex + 1;
      setCurrentEditIndex(newIndex);
      setImageUrl(editHistory[newIndex]);
      setResult(null);
      setShowComparison(false);
      setHasUnsavedChanges(false);
      clearMask();

      showToast("Redid edit", "success");
    }
  };

  // Reset to original image
  const resetToOriginal = () => {
    if (editHistory.length > 0) {
      setCurrentEditIndex(0);
      setImageUrl(editHistory[0]);
      setResult(null);
      setShowComparison(false);
      setHasUnsavedChanges(false);
      clearMask();
      setPrompt("");

      showToast("Reset to original image", "success");
    }
  };

  // Accept edit and update history
  const acceptEdit = () => {
    if (!result) {
      showToast("No edit result to accept", "error");
      return;
    }

    // Update history and current index
    const newHistory = [...editHistory.slice(0, currentEditIndex + 1), result];
    const newIndex = newHistory.length - 1;

    // Update all states
    setEditHistory(newHistory);
    setCurrentEditIndex(newIndex);
    setImageUrl(result);

    // Clear editing states
    setResult(null);
    setShowComparison(false);
    setHasUnsavedChanges(false);
    clearMask();
    setPrompt("");

    showToast(
      "Edit accepted! You can continue editing from this new version.",
      "success"
    );
  };

  // Save edited image to gallery
  const handleSaveEditToGallery = async () => {
    if (!result) return
    
    setIsSaving(true)
    
    // Create description for the edited image
    const editDescription = originalImageData 
      ? `${originalImageData.prompt} (edited: ${prompt})`
      : `Edited image: ${prompt}`
    
    const saveResult = saveImageToGallery({
      prompt: editDescription,
      style: originalImageData?.style || 'edited',
      imageUrl: result,
      settings: originalImageData?.settings || {
        steps: 30,
        guidance: 7.5, 
        seed: Math.floor(Math.random() * 1000000)
      }
    })

    if (saveResult.success && saveResult.image) {
      setRecentlySaved(saveResult.image.id)
      showToast('Edited image saved to gallery! 🎨', 'success')
      
      setTimeout(() => setRecentlySaved(null), 3000)
    } else {
      showToast('Failed to save edited image to gallery', 'error')
    }
    
    setIsSaving(false)
  }

  if (!isClient) {
    return null;
  }

  return (
    <div className="w-full h-[calc(100vh-4rem)] bg-black p-2 sm:p-4 overflow-hidden">
      {/* Sound Control */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="fixed top-4 right-4 z-50 bg-black border-2 border-gray-600 p-2 rounded-full hover:border-cyan-400 transition-colors duration-300"
        aria-label={isMuted ? "Unmute sound effects" : "Mute sound effects"}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-gray-400" />
        ) : (
          <Volume2 className="w-5 h-5 text-cyan-400" />
        )}
      </button>

      {/* Main Container */}
      <div className="bg-gray-900 rounded-lg border-4 border-gray-700 shadow-2xl relative overflow-hidden h-full">
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

        {/* Animated background elements */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          suppressHydrationWarning
        >
          {isClient &&
            animatedElements.map((element) => (
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
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b-2 border-gray-700">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 p-1 rounded-lg animate-pulse">
              <div className="bg-black px-4 py-2 rounded-md">
                <h1 className="text-xl md:text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 uppercase tracking-wider">
                  🎨 AI INPAINT STUDIO 🎨
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <div className="text-green-400 font-mono text-sm animate-pulse">
                CONTROLNET ONLINE
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {originalImageData && (
              <Badge variant="outline" className="font-mono text-xs">
                FROM:{" "}
                {originalImageData.style !== "none"
                  ? originalImageData.style.toUpperCase()
                  : "DEFAULT"}
              </Badge>
            )}
            <Button
              onClick={() => {
                if (onBack) {
                  onBack();
                } else if (typeof window !== "undefined") {
                  window.location.href = "/generate";
                }
              }}
              className="bg-blue-900/80 border-2 border-blue-400/50 text-blue-300 hover:bg-blue-800/80 font-mono uppercase tracking-wide backdrop-blur-sm flex items-center gap-2 hover:scale-105 transition-transform"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK
            </Button>
          </div>
        </div>

        {/* Original Image Info Panel */}
        {originalImageData && (
          <div className="relative z-10 mx-4 mt-4 bg-gradient-to-r from-gray-800/50 to-purple-800/30 border-2 border-purple-400/30 rounded-lg p-3 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-purple-400 font-mono text-xs">
                <Palette className="w-3 h-3" />
                ORIGINAL:
              </div>
              <div className="text-white font-mono text-xs flex-1 truncate">
                {originalImageData.prompt}
              </div>
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs">
                <Shuffle className="w-3 h-3" />
                SEED: {originalImageData.settings.seed}
              </div>
              <div className="flex items-center gap-2 text-green-400 font-mono text-xs">
                <Clock className="w-3 h-3" />
                {formatTimestamp(originalImageData.timestamp)}
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-4 gap-4 p-4 xl:items-start h-[calc(100%-6rem)]">
          {/* Left Panel - Tools & ControlNet */}
          <div className="xl:col-span-1 space-y-4 overflow-y-auto pr-2 max-h-full [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800/50 [&::-webkit-scrollbar-thumb]:bg-purple-500/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-purple-400/50 [&::-webkit-scrollbar]:border-l [&::-webkit-scrollbar]:border-purple-500/20">
            {/* Edit Mode */}
            <div className="bg-gradient-to-br from-black/60 via-purple-900/20 to-pink-900/20 backdrop-blur-sm border-2 border-purple-400/50 rounded-xl p-4">
              <Label className="text-sm font-bold font-mono text-white uppercase tracking-wide mb-3 block flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                EDIT MODE
              </Label>
              <Tabs
                value={editMode}
                onValueChange={(value) => setEditMode(value as EditMode)}
              >
                <TabsList className="grid w-full grid-cols-3 gap-1 bg-gray-800/50 p-1">
                  <TabsTrigger value="inpaint" className="text-xs font-mono">
                    FILL
                  </TabsTrigger>
                  <TabsTrigger value="outpaint" className="text-xs font-mono">
                    EXPAND
                  </TabsTrigger>
                  <TabsTrigger value="replace" className="text-xs font-mono">
                    REPLACE
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Enhanced Drawing Tools */}
            <div className="bg-gradient-to-br from-black/60 via-cyan-900/20 to-blue-900/20 backdrop-blur-sm border-2 border-cyan-400/50 rounded-xl p-4">
              <Label className="text-sm font-bold font-mono text-white uppercase tracking-wide mb-3 block flex items-center gap-2">
                <Palette className="w-4 h-4 text-cyan-400" />
                SELECTION TOOLS
              </Label>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <Button
                  size="sm"
                  variant={tool === "brush" ? "default" : "outline"}
                  onClick={() => setTool("brush")}
                  className="font-mono text-xs"
                >
                  <Brush className="w-3 h-3 mr-1" />
                  BRUSH
                </Button>
                <Button
                  size="sm"
                  variant={tool === "eraser" ? "default" : "outline"}
                  onClick={() => setTool("eraser")}
                  className="font-mono text-xs"
                >
                  <Eraser className="w-3 h-3 mr-1" />
                  ERASE
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-mono text-white mb-2 block">
                    BRUSH SIZE: {brushSize}PX
                  </Label>
                  <Slider
                    value={[brushSize]}
                    onValueChange={([value]) => setBrushSize(value)}
                    min={5}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono text-white">
                    SHOW MASK
                  </Label>
                  <Switch checked={showMask} onCheckedChange={setShowMask} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    onClick={clearMask}
                    className="font-mono text-xs bg-red-600 hover:bg-red-700"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    CLEAR
                  </Button>

                  <Button
                    size="sm"
                    onClick={refineMask}
                    className="font-mono text-xs bg-blue-600 hover:bg-blue-700"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    REFINE
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  {/* Smart Resize Button */}
                  <Button
                    size="sm"
                    onClick={() => {
                      if (canvasRef.current && imageUrl) {
                        const img = new window.Image();
                        img.crossOrigin = "anonymous";
                        img.onload = () => {
                          const canvas = canvasRef.current!;
                          const maskCanvas = maskCanvasRef.current!;
                          const ctx = canvas.getContext("2d")!;

                          // 🔥 IMPROVED: Smart resize - use container size efficiently
                          const container = canvas.closest(".xl\\:col-span-2");
                          const containerRect =
                            container?.getBoundingClientRect();

                          const containerWidth = containerRect?.width || 600;
                          const containerHeight = window.innerHeight * 0.6;

                          // 🔥 FIXED: Better fit calculation
                          const maxWidth = Math.min(700, containerWidth - 40);
                          const maxHeight = Math.min(600, containerHeight - 60);

                          const scaleX = maxWidth / img.width;
                          const scaleY = maxHeight / img.height;
                          const scale = Math.min(scaleX, scaleY, 1); // Don't upscale beyond original

                          const width = Math.round(img.width * scale);
                          const height = Math.round(img.height * scale);

                          // Apply new dimensions
                          canvas.width = width;
                          canvas.height = height;
                          maskCanvas.width = width;
                          maskCanvas.height = height;
                          canvas.style.width = `${width}px`;
                          canvas.style.height = `${height}px`;
                          maskCanvas.style.width = `${width}px`;
                          maskCanvas.style.height = `${height}px`;

                          // Update stored dimensions
                          setCanvasDimensions({
                            width,
                            height,
                            ratio: scale,
                          });

                          // Redraw image
                          ctx.clearRect(0, 0, width, height);
                          ctx.drawImage(img, 0, 0, width, height);
                        };
                        img.src = imageUrl;
                      }
                    }}
                    className="font-mono text-xs bg-green-600 hover:bg-green-700"
                  >
                    📏 SMART RESIZE
                  </Button>

                  {/* Container Fit Button */}
                  <Button
                    size="sm"
                    onClick={() => {
                      if (canvasRef.current && imageUrl) {
                        const img = new window.Image();
                        img.crossOrigin = "anonymous";
                        img.onload = () => {
                          const canvas = canvasRef.current!;
                          const maskCanvas = maskCanvasRef.current!;
                          const ctx = canvas.getContext("2d")!;

                          // 🔥 FIXED: Force fit to container with generous padding
                          const container = canvas.closest(".xl\\:col-span-2");
                          const containerRect =
                            container?.getBoundingClientRect();

                          const maxWidth = Math.min(
                            500,
                            (containerRect?.width || 600) - 80
                          );
                          const maxHeight = Math.min(
                            400,
                            window.innerHeight * 0.5
                          );

                          const scaleX = maxWidth / img.width;
                          const scaleY = maxHeight / img.height;
                          const scale = Math.min(scaleX, scaleY); // Always fit within container

                          const width = Math.round(img.width * scale);
                          const height = Math.round(img.height * scale);

                          // Apply container-fit dimensions
                          canvas.width = width;
                          canvas.height = height;
                          maskCanvas.width = width;
                          maskCanvas.height = height;
                          canvas.style.width = `${width}px`;
                          canvas.style.height = `${height}px`;
                          maskCanvas.style.width = `${width}px`;
                          maskCanvas.style.height = `${height}px`;

                          // Update stored dimensions
                          setCanvasDimensions({
                            width,
                            height,
                            ratio: scale,
                          });

                          // Redraw image
                          ctx.clearRect(0, 0, width, height);
                          ctx.drawImage(img, 0, 0, width, height);
                        };
                        img.src = imageUrl;
                      }
                    }}
                    className="font-mono text-xs bg-blue-600 hover:bg-blue-700"
                  >
                    📦 FIT CONTAINER
                  </Button>
                </div>

                <Button
                  size="sm"
                  onClick={previewMaskArea}
                  className="w-full font-mono text-xs bg-purple-600 hover:bg-purple-700"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  PREVIEW MASK AREA
                </Button>

                <Button
                  size="sm"
                  onClick={showMaskTips}
                  className="w-full font-mono text-xs bg-yellow-600 hover:bg-yellow-700"
                >
                  💡 PRECISION TIPS
                </Button>
              </div>
            </div>

            {/* ControlNet Panel */}
            <div className="bg-gradient-to-br from-black/60 via-green-900/20 to-emerald-900/20 backdrop-blur-sm border-2 border-green-400/50 rounded-xl p-4">
              <Label className="text-sm font-bold font-mono text-white uppercase tracking-wide mb-3 block flex items-center gap-2">
                <Settings className="w-4 h-4 text-green-400" />
                CONTROLNET
              </Label>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono text-white">
                    ENABLE CONTROLNET
                  </Label>
                  <Switch
                    checked={useControlNet}
                    onCheckedChange={setUseControlNet}
                  />
                </div>

                {useControlNet && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-mono text-white">
                        PRESERVE POSE
                      </Label>
                      <Switch
                        checked={preservePose}
                        onCheckedChange={setPreservePose}
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-mono text-white mb-2 block">
                        CONTROL STRENGTH: {controlStrength}%
                      </Label>
                      <Slider
                        value={[controlStrength]}
                        onValueChange={([value]) => setControlStrength(value)}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-mono text-white">
                        REFERENCE IMAGE
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="flex-1 font-mono text-xs"
                        >
                          <label className="cursor-pointer">
                            <Upload className="w-3 h-3 mr-1" />
                            UPLOAD
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleReferenceUpload}
                              className="hidden"
                            />
                          </label>
                        </Button>
                        {referenceImage && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReferenceImage(null)}
                            className="font-mono text-xs"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      {referenceImage && (
                        <div className="relative h-20 w-full">
                          <img
                            src={referenceImage}
                            alt="Reference"
                            className="object-cover rounded border-2 border-green-400/30"
                          />
                          <div className="absolute top-1 left-1 bg-green-500 text-black px-1 rounded text-xs font-mono font-bold">
                            REF
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Mask precision tips panel */}
            <div className="bg-gradient-to-br from-gray-800/50 to-yellow-800/30 border-2 border-yellow-600/50 rounded-lg p-3">
              <h4 className="text-xs font-mono text-yellow-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Target className="w-3 h-3" />
                PRECISION TIPS
              </h4>
              <div className="space-y-1 text-xs font-mono text-gray-400">
                <div>🎯 Draw EXACTLY over what you want to change</div>
                <div>🔍 Use smaller brush for detailed areas</div>
                <div>📝 Be specific: red ribbon around neck</div>
                <div>👁️ Use Preview to see masked area</div>
                <div>✨ Use Refine to smooth mask edges</div>
                <div className="text-yellow-300 mt-2">
                  💡 Smaller, precise masks = better results!
                </div>
              </div>
            </div>
          </div>

          {/* Center Panel - Canvas */}
          <div className="xl:col-span-2">
            <div className="bg-gradient-to-br from-black/60 via-gray-900/20 to-black/60 backdrop-blur-sm border-2 border-gray-400/50 rounded-xl p-4 h-full">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm font-bold font-mono text-white uppercase tracking-wide flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  CANVAS EDITOR
                </Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs text-white">
                    {tool.toUpperCase()}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setZoom(Math.max(25, zoom - 25))}
                    >
                      <ZoomOut className="w-3 h-3" />
                    </Button>
                    <span className="text-xs font-mono text-white w-12 text-center">
                      {zoom}%
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setZoom(Math.min(200, zoom + 25))}
                    >
                      <ZoomIn className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="relative bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600 min-h-[500px] flex items-center justify-center p-4">
                {showComparison && result ? (
                  <div className="flex w-full h-full max-w-4xl">
                    <div className="flex-1 relative border-r border-gray-600">
                      <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-mono font-bold z-10">
                        BEFORE
                      </div>
                      <div className="relative w-full h-full flex items-center justify-center p-2">
                        <img
                          src={imageUrl}
                          alt="Original"
                          className="max-w-full max-h-full object-contain"
                          style={{ transform: `scale(${zoom / 100})` }}
                        />
                      </div>
                    </div>
                    <div className="flex-1 relative">
                      <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-mono font-bold z-10">
                        AFTER
                      </div>
                      <div className="relative w-full h-full flex items-center justify-center p-2">
                        <img
                          src={result}
                          alt="Result"
                          className="max-w-full max-h-full object-contain"
                          style={{ transform: `scale(${zoom / 100})` }}
                          onLoad={() => console.log("✅ Result image loaded")}
                          onError={(e) =>
                            console.error("❌ Result image failed", e)
                          }
                          crossOrigin="anonymous"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center w-full h-full">
                    <div className="relative">
                      <canvas
                        ref={canvasRef}
                        className="border border-gray-600 rounded shadow-lg"
                        style={{
                          transform: `scale(${zoom / 100})`,
                          transformOrigin: "center center",
                          display: "block",
                        }}
                      />
                      <canvas
                        ref={maskCanvasRef}
                        className={`absolute top-0 left-0 cursor-crosshair transition-opacity pointer-events-auto ${
                          showMask ? "opacity-100" : "opacity-0"
                        }`}
                        style={{
                          transform: `scale(${zoom / 100})`,
                          transformOrigin: "center center",
                        }}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                      />

                      <div className="absolute top-2 right-2 bg-black/70 text-green-400 px-2 py-1 rounded text-xs font-mono font-bold">
                        {canvasRef.current?.width}×{canvasRef.current?.height}px
                        {canvasDimensions
                          ? ` (${Math.round(canvasDimensions.ratio * 100)}%)`
                          : ""}
                        {showComparison ? " | COMPARISON" : " | EDITING"}
                      </div>

                      <div className="absolute bottom-2 left-2 bg-black/70 text-cyan-400 px-2 py-1 rounded text-xs font-mono">
                        {imageUrl ? "IMAGE LOADED" : "NO IMAGE"}
                      </div>
                    </div>

                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded">
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-lg text-center border-2 border-purple-400">
                          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-white" />
                          <p className="text-sm font-mono font-bold text-white uppercase">
                            AI PROCESSING...
                          </p>
                          <p className="text-xs text-purple-200 font-mono">
                            CONTROLNET + INPAINTING
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Prompts & Actions */}
          <div className="xl:col-span-1 space-y-4 overflow-y-auto pl-2 max-h-full [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800/50 [&::-webkit-scrollbar-thumb]:bg-cyan-500/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-cyan-400/50 [&::-webkit-scrollbar]:border-l [&::-webkit-scrollbar]:border-cyan-500/20">
            {/* Quick Prompts */}
            <div className="bg-gradient-to-br from-black/60 via-pink-900/20 to-purple-900/20 backdrop-blur-sm border-2 border-pink-400/50 rounded-xl p-4">
              <Label className="text-sm font-bold font-mono text-white uppercase tracking-wide mb-3 block flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-pink-400" />
                QUICK PROMPTS
              </Label>

              <Tabs defaultValue="add" className="w-full">
                <TabsList className="grid w-full grid-cols-2 gap-1 bg-gray-800/50 p-1 mb-3">
                  <TabsTrigger value="add" className="text-xs font-mono">
                    ADD
                  </TabsTrigger>
                  <TabsTrigger value="change" className="text-xs font-mono">
                    CHANGE
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="add" className="space-y-2">
                  {QUICK_PROMPTS.add.map((quickPrompt, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickPrompt(quickPrompt)}
                      className="w-full justify-start text-xs font-mono h-8 hover:bg-pink-500/20 hover:border-pink-400"
                    >
                      + {quickPrompt}
                    </Button>
                  ))}
                </TabsContent>

                <TabsContent value="change" className="space-y-2">
                  {QUICK_PROMPTS.change.map((quickPrompt, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickPrompt(quickPrompt)}
                      className="w-full justify-start text-xs font-mono h-8 hover:bg-pink-500/20 hover:border-pink-400"
                    >
                      ≫ {quickPrompt}
                    </Button>
                  ))}
                </TabsContent>
              </Tabs>
            </div>

            {/* Improved Prompt Input */}
            <div className="bg-gradient-to-br from-black/60 via-blue-900/20 to-cyan-900/20 backdrop-blur-sm border-2 border-cyan-400/50 rounded-xl p-4">
              <Label className="text-sm font-bold font-mono text-white uppercase tracking-wide mb-3 block flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                EDIT PROMPT
              </Label>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-mono text-white mb-2 block">
                    DESCRIBE CHANGES
                  </Label>

                  <div className="text-xs font-mono text-cyan-400 mb-2 bg-black/30 p-2 rounded border border-cyan-400/20">
                    💡 <strong>EXAMPLES:</strong>
                    <br />• add a red ribbon around the neck
                    <br />• change the collar to blue
                    <br />• add sunglasses
                    <br />• make the background winter scene
                    <br />
                    <span className="text-yellow-300">
                      ✨ Be specific about location and what you want!
                    </span>
                  </div>

                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="add a red ribbon around the neck, change to blue color..."
                    className="min-h-[80px] bg-gray-800/50 border-2 border-cyan-400/30 text-white placeholder-gray-400 font-mono text-xs resize-none"
                  />

                  {prompt.trim() && (
                    <div className="mt-2 text-xs font-mono">
                      {prompt.toLowerCase().includes("edit this") ? (
                        <div className="text-red-400 bg-red-900/20 p-2 rounded border border-red-400/30">
                          ❌ Remove `edit this` - just describe what you want:
                          add red ribbon
                        </div>
                      ) : prompt.trim().length < 3 ? (
                        <div className="text-yellow-400 bg-yellow-900/20 p-2 rounded border border-yellow-400/30">
                          ⚠️ Be more specific about what you want to change
                        </div>
                      ) : (
                        <div className="text-green-400 bg-green-900/20 p-2 rounded border border-green-400/30">
                          ✅ Good prompt! This will be sent to the AI.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-mono text-white mb-2 block">
                    NEGATIVE PROMPT
                  </Label>
                  <Textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="what to avoid..."
                    className="min-h-[60px] bg-gray-800/50 border-2 border-cyan-400/30 text-white placeholder-gray-400 font-mono text-xs resize-none"
                  />
                </div>

                <Button
                  onClick={processEdit}
                  disabled={
                    !prompt.trim() ||
                    isProcessing ||
                    prompt.toLowerCase().includes("edit this")
                  }
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 font-mono text-sm py-6 uppercase tracking-wide disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      PROCESSING...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      APPLY EDIT
                    </div>
                  )}
                </Button>

                {prompt.trim() && (
                  <Button
                    onClick={() => setPrompt("")}
                    variant="outline"
                    size="sm"
                    className="w-full font-mono text-xs border-gray-400/50 text-gray-300 hover:bg-gray-500/20"
                  >
                    🗑️ CLEAR PROMPT
                  </Button>
                )}
              </div>
            </div>

            {/* Fixed Results & Workflow */}
            {result && (
              <div className="bg-gradient-to-br from-black/60 via-emerald-900/20 to-green-900/20 backdrop-blur-sm border-2 border-emerald-400/50 rounded-xl p-4">
                <Label className="text-sm font-bold font-mono text-white uppercase tracking-wide mb-3 block flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  EDIT RESULT
                </Label>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-mono text-white">
                      SHOW COMPARISON
                    </Label>
                    <Switch
                      checked={showComparison}
                      onCheckedChange={(checked) => {
                        setShowComparison(checked);
                      }}
                      className="data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-gray-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-mono text-emerald-400 mb-2">
                      ✨ REVIEW YOUR EDIT:
                    </div>

                    <Button
                      onClick={() => {
                        acceptEdit();
                      }}
                      size="sm"
                      className="w-full font-mono text-xs bg-emerald-900/80 text-emerald-100 border-2 border-emerald-500/30 hover:bg-emerald-800/90 hover:border-emerald-400/50 hover:text-emerald-50 transition-colors mb-2"
                    >
                      <Check className="w-3 h-3 mr-1" />ACCEPT & CONTINUE
                      EDITING
                    </Button>

                    <Button
                      onClick={() => {
                        rejectEdit();
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full font-mono text-xs bg-red-900/80 text-red-100 border-2 border-red-500/30 hover:bg-red-800/90 hover:border-red-400/50 hover:text-red-50 transition-colors"
                    >
                      <X className="w-3 h-3 mr-1" />
                      REJECT & KEEP CURRENT IMAGE
                    </Button>
                  </div>

                  <Button
                    onClick={handleSaveEditToGallery}
                    disabled={isSaving || !result}
                    size="sm"
                    className="w-full font-mono text-xs bg-gradient-to-r from-purple-900/90 to-pink-900/90 text-purple-100 border-2 border-purple-500/30 hover:bg-purple-800/90 hover:border-purple-400/50 hover:text-purple-50 transition-colors shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                  >
                    {isSaving ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        SAVING...
                      </div>
                    ) : recentlySaved ? (
                      <div className="flex items-center gap-2">
                        <Heart className="w-3 h-3 text-red-400 fill-current" />
                        SAVED!
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save className="w-3 h-3" />
                        SAVE TO GALLERY
                      </div>
                    )}
                  </Button>

                  <div className="text-xs font-mono text-gray-400 bg-black/30 p-2 rounded border border-emerald-400/20">
                    💡 <strong>WHAT HAPPENS:</strong>
                    <br />• <span className="text-orange-300">REJECT</span>:
                    Clears edit result, keeps original image ready for
                    re-editing
                    <br />• <span className="text-green-300">ACCEPT</span>:
                    Saves edit as new version in history
                    <br />• Both options preserve your current editing session
                  </div>
                </div>
              </div>
            )}

            {/* Always visible current image status panel */}
            <div className="bg-gradient-to-br from-gray-800/50 to-blue-800/30 border-2 border-blue-600/50 rounded-lg p-3">
              <h4 className="text-xs font-mono text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Info className="w-3 h-3" />
                CURRENT IMAGE STATUS
              </h4>
              <div className="space-y-1 text-xs font-mono text-gray-400">
                <div className="text-blue-300">
                  📸 Image Version: {currentEditIndex + 1} of{" "}
                  {editHistory.length}
                </div>
                <div className="text-gray-300">
                  🎯 Working Image: {imageUrl ? "Loaded" : "None"}
                </div>
                <div className="text-gray-300">
                  🎨 Edit Result: {result ? "Ready" : "None"}
                </div>
                <div className="text-gray-300">
                  💾 Unsaved Changes: {hasUnsavedChanges ? "Yes" : "No"}
                </div>
                {result && (
                  <div className="text-yellow-300 mt-2">
                    💡 You have a new edit result! Accept or Reject above.
                  </div>
                )}
              </div>
            </div>

            {/* Edit History & Undo/Redo Controls */}
            {editHistory.length > 1 && !result && (
              <div className="bg-gradient-to-br from-black/60 via-blue-900/20 to-indigo-900/20 backdrop-blur-sm border-2 border-blue-400/50 rounded-xl p-4">
                <Label className="text-sm font-bold font-mono text-white uppercase tracking-wide mb-3 block flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  EDIT HISTORY
                </Label>

                <div className="space-y-3">
                  <div className="text-xs font-mono text-blue-300 text-center">
                    VERSION {currentEditIndex + 1} OF {editHistory.length}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      onClick={undoEdit}
                      disabled={currentEditIndex === 0}
                      variant="outline"
                      size="sm"
                      className="font-mono text-xs"
                    >
                      ← UNDO
                    </Button>

                    <Button
                      onClick={resetToOriginal}
                      variant="outline"
                      size="sm"
                      className="font-mono text-xs"
                    >
                      ORIGINAL
                    </Button>

                    <Button
                      onClick={redoEdit}
                      disabled={currentEditIndex === editHistory.length - 1}
                      variant="outline"
                      size="sm"
                      className="font-mono text-xs"
                    >
                      REDO →
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 border-2 border-gray-600/50 rounded-lg p-3">
              <h4 className="text-xs font-mono text-cyan-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Info className="w-3 h-3" />
                WORKFLOW
              </h4>
              <div className="space-y-1 text-xs font-mono text-gray-400">
                <div>1. SELECT area to edit</div>
                <div>2. DESCRIBE changes</div>
                <div>3. APPLY edit with AI</div>
                <div>4. ACCEPT or REJECT result</div>
                <div>5. CONTINUE editing or SAVE</div>
                <div className="text-cyan-300 mt-2">
                  🎯 ControlNet preserves pose!
                </div>
                <div className="text-yellow-300">
                  ⚡ Iterative editing workflow
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

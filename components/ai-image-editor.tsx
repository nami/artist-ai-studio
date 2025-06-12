'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  ArrowLeft, 
  Brush, 
  Eraser, 
  Wand2, 
  Download, 
  Save, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Upload,
  Eye,
  Sparkles,
  Square,
  Palette,
  Settings,
  RefreshCw,
  Check,
  X,
  Info,
  Cpu,
  Layers,
  Volume2,
  VolumeX,
  Target,
  Clock,
  Shuffle
} from 'lucide-react';

// Import only the essential UI components
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

type Tool = 'brush' | 'eraser' | 'magic' | 'rectangle';
type EditMode = 'inpaint' | 'outpaint' | 'replace';

interface ImageData {
  id: string;
  prompt: string;
  style: string;
  imageUrl: string;
  timestamp: Date; // Date object for proper time formatting
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
    'add a red ribbon',
    'add sunglasses', 
    'add a hat',
    'add jewelry',
    'add flowers',
    'add a bow tie'
  ],
  change: [
    'change to blue color',
    'make it golden',
    'change the background',
    'make it sparkly',
    'change to winter scene',
    'make it vintage style'
  ]
};

export default function AIImageEditor({ onBack }: ImageEditorProps) {
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);

  // Image data from generator
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');

  // Client-side rendering state
  const [isClient, setIsClient] = useState(false);
  const [animatedElements, setAnimatedElements] = useState<AnimatedElement[]>([]);

  // State
  const [tool, setTool] = useState<Tool>('brush');
  const [editMode, setEditMode] = useState<EditMode>('inpaint');
  const [brushSize, setBrushSize] = useState(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showMask, setShowMask] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, distorted');
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
  
  // Advanced options
  const [editStrength, setEditStrength] = useState(75);
  const [maskBlur, setMaskBlur] = useState(10);
  const [expandMask, setExpandMask] = useState(5);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Simple toast function if external toast isn't available
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log(`${type.toUpperCase()}: ${message}`);
    // You can replace this with your actual toast implementation
    if (typeof window !== 'undefined' && 'alert' in window) {
      // Fallback for demo
      if (type === 'error') {
        alert(`Error: ${message}`);
      }
    }
  };

  // Utility function to safely format timestamps
  const formatTimestamp = (timestamp: Date | string) => {
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return date.toLocaleTimeString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid time';
    }
  };

  // Initialize client-side rendering and animated elements
  useEffect(() => {
    setIsClient(true);
    
    // Delay animation generation to ensure hydration is complete
    const animationTimer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        // Generate animated elements once on client side
        const elements: AnimatedElement[] = Array.from({ length: 15 }, (_, i) => ({
          id: i,
          left: Math.random() * 100,
          top: Math.random() * 100,
          animationDelay: Math.random() * 3,
          animationDuration: 2 + Math.random() * 4,
        }));
        
        setAnimatedElements(elements);
      }
    }, 150);

    return () => clearTimeout(animationTimer);
  }, []);

  // Load image data from sessionStorage when component mounts
  useEffect(() => {
    if (!isClient) return;
    
    try {
      const storedData = sessionStorage?.getItem('editImageData');
      if (storedData) {
        const rawImageData = JSON.parse(storedData);
        // Convert timestamp string back to Date object
        const imageData: ImageData = {
          ...rawImageData,
          timestamp: new Date(rawImageData.timestamp)
        };
        setOriginalImageData(imageData);
        setImageUrl(imageData.imageUrl);
        
        // Pre-fill some editing context
        setPrompt(`Edit this ${imageData.style !== 'none' ? imageData.style + ' style ' : ''}image: `);
        
        showToast(`Image loaded for editing: "${imageData.prompt.substring(0, 30)}..."`, 'success');
        
        // Clear the sessionStorage data
        sessionStorage?.removeItem('editImageData');
      } else {
        // Fallback to placeholder if no data
        setImageUrl('https://picsum.photos/800/600');
        showToast('No image data found, using placeholder for demo', 'info');
      }
    } catch (error) {
      console.error('Error loading image data:', error);
      setImageUrl('https://picsum.photos/800/600');
      showToast('Failed to load image data', 'error');
    }
  }, [isClient]);

  // Initialize canvas when image URL is available
  useEffect(() => {
    if (!canvasRef.current || !maskCanvasRef.current || !imageUrl || !isClient) return;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current!;
      const maskCanvas = maskCanvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      
      // Set canvas size
      const maxSize = 600;
      const ratio = Math.min(maxSize / img.width, maxSize / img.height);
      const width = img.width * ratio;
      const height = img.height * ratio;
      
      canvas.width = width;
      canvas.height = height;
      maskCanvas.width = width;
      maskCanvas.height = height;
      
      // Draw image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Clear mask
      const maskCtx = maskCanvas.getContext('2d')!;
      maskCtx.clearRect(0, 0, width, height);
    };
    img.src = imageUrl;
  }, [imageUrl, isClient]);

  // Drawing functions
  const startDrawing = useCallback((e: React.MouseEvent) => {
    if (!maskCanvasRef.current) return;
    
    const canvas = maskCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setIsDrawing(true);
    
    const ctx = canvas.getContext('2d')!;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.fillStyle = 'rgba(255, 0, 255, 0.6)';
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.6)';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }, [tool, brushSize]);

  const draw = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !maskCanvasRef.current) return;
    
    const canvas = maskCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const ctx = canvas.getContext('2d')!;
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearMask = useCallback(() => {
    if (!maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
  }, []);

  const handleQuickPrompt = (quickPrompt: string) => {
    setPrompt(prev => prev ? `${prev}, ${quickPrompt}` : quickPrompt);
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setReferenceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const processEdit = async () => {
    if (!prompt.trim()) {
      showToast('Please describe what you want to change', 'error');
      return;
    }
    
    setIsProcessing(true);
    showToast('Processing edit with ControlNet...', 'info');
    
    setTimeout(() => {
      // For demo, just use a slightly modified version
      const editedUrl = `${imageUrl}?edited=${Date.now()}`;
      setResult(editedUrl);
      setIsProcessing(false);
      setShowComparison(true);
      
      showToast('Edit completed! Your image has been enhanced with AI precision', 'success');
    }, 3000);
  };

  const handleSaveAndReturn = () => {
    if (!result || !originalImageData) {
      showToast('No edited image to save', 'error');
      return;
    }
    
    // Create new image data with edit applied
    const editedImageData = {
      ...originalImageData,
      id: Math.random().toString(36).substr(2, 9),
      imageUrl: result,
      prompt: `${originalImageData.prompt} (edited: ${prompt})`,
      timestamp: new Date().toISOString(), // Store as ISO string for sessionStorage
    };
    
    showToast('Saving edited image and returning to generator!', 'success');
    
    // Store in sessionStorage and navigate
    if (typeof window !== 'undefined' && sessionStorage) {
      sessionStorage.setItem('editedImageReturn', JSON.stringify(editedImageData));
      window.location.href = '/generate';
    }
  };

  const saveToGalleryAndView = () => {
    if (!result) {
      showToast('No edited image to save', 'error');
      return;
    }
    
    showToast('Image saved to gallery! Navigating to gallery...', 'success');
    
    // Navigate to gallery after short delay
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.href = '/gallery';
      }
    }, 1000);
  };

  const downloadResult = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `edited-${Date.now()}.png`;
    link.click();
    
    showToast('Download started!', 'success');
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/generate';
    }
  };

  // Don't render until client-side hydration is complete
  if (!isClient) {
    return null;
  }

  return (
    <div className="w-full min-h-screen bg-black p-2 sm:p-4">
      {/* Sound Control */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="fixed top-4 right-4 z-50 bg-black border-2 border-gray-600 p-2 rounded-full hover:border-cyan-400 transition-colors duration-300"
        aria-label={isMuted ? "Unmute sound effects" : "Mute sound effects"}
      >
        {isMuted ? <VolumeX className="w-5 h-5 text-gray-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
      </button>

      {/* Main Container */}
      <div className="bg-gray-900 rounded-lg border-4 border-gray-700 shadow-2xl relative overflow-hidden">
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

        {/* Animated background elements - only render on client */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" suppressHydrationWarning>
          {isClient && animatedElements.map((element) => (
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
              <div className="text-green-400 font-mono text-sm animate-pulse">CONTROLNET ONLINE</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {originalImageData && (
              <Badge variant="outline" className="font-mono text-xs">
                FROM: {originalImageData.style !== 'none' ? originalImageData.style.toUpperCase() : 'DEFAULT'}
              </Badge>
            )}
            <Button
              onClick={handleBack}
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
                "{originalImageData.prompt}"
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

        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-4 gap-4 p-4">
          {/* Left Panel - Tools & ControlNet */}
          <div className="xl:col-span-1 space-y-4">
            {/* Edit Mode */}
            <div className="bg-gradient-to-br from-black/60 via-purple-900/20 to-pink-900/20 backdrop-blur-sm border-2 border-purple-400/50 rounded-xl p-4">
              <Label className="text-sm font-bold font-mono text-white uppercase tracking-wide mb-3 block flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                EDIT MODE
              </Label>
              <Tabs value={editMode} onValueChange={(value) => setEditMode(value as EditMode)}>
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

            {/* Drawing Tools */}
            <div className="bg-gradient-to-br from-black/60 via-cyan-900/20 to-blue-900/20 backdrop-blur-sm border-2 border-cyan-400/50 rounded-xl p-4">
              <Label className="text-sm font-bold font-mono text-white uppercase tracking-wide mb-3 block flex items-center gap-2">
                <Palette className="w-4 h-4 text-cyan-400" />
                SELECTION TOOLS
              </Label>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <Button
                  size="sm"
                  variant={tool === 'brush' ? "default" : "outline"}
                  onClick={() => setTool('brush')}
                  className="font-mono text-xs"
                >
                  <Brush className="w-3 h-3 mr-1" />
                  BRUSH
                </Button>
                <Button
                  size="sm"
                  variant={tool === 'eraser' ? "default" : "outline"}
                  onClick={() => setTool('eraser')}
                  className="font-mono text-xs"
                >
                  <Eraser className="w-3 h-3 mr-1" />
                  ERASE
                </Button>
                <Button
                  size="sm"
                  variant={tool === 'magic' ? "default" : "outline"}
                  onClick={() => setTool('magic')}
                  className="font-mono text-xs"
                >
                  <Wand2 className="w-3 h-3 mr-1" />
                  MAGIC
                </Button>
                <Button
                  size="sm"
                  variant={tool === 'rectangle' ? "default" : "outline"}
                  onClick={() => setTool('rectangle')}
                  className="font-mono text-xs"
                >
                  <Square className="w-3 h-3 mr-1" />
                  SELECT
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
                  <Label className="text-xs font-mono text-white">SHOW MASK</Label>
                  <Switch checked={showMask} onCheckedChange={setShowMask} />
                </div>

                <Button size="sm" onClick={clearMask} className="w-full font-mono text-xs bg-red-600 hover:bg-red-700">
                  <RotateCcw className="w-3 h-3 mr-1" />
                  CLEAR MASK
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
                  <Label className="text-xs font-mono text-white">ENABLE CONTROLNET</Label>
                  <Switch checked={useControlNet} onCheckedChange={setUseControlNet} />
                </div>

                {useControlNet && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-mono text-white">PRESERVE POSE</Label>
                      <Switch checked={preservePose} onCheckedChange={setPreservePose} />
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
                      <Label className="text-xs font-mono text-white">REFERENCE IMAGE</Label>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild className="flex-1 font-mono text-xs">
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
                        <div className="relative">
                          <img
                            src={referenceImage}
                            alt="Reference"
                            className="w-full h-20 object-cover rounded border-2 border-green-400/30"
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

            {/* Advanced Settings */}
            <div className="bg-gradient-to-br from-black/60 via-orange-900/20 to-yellow-900/20 backdrop-blur-sm border-2 border-orange-400/50 rounded-xl p-4">
              <button
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="w-full flex items-center justify-between mb-3"
              >
                <Label className="text-sm font-bold font-mono text-white uppercase tracking-wide flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-400" />
                  ADVANCED
                </Label>
                <div className={`text-orange-400 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`}>
                  ▼
                </div>
              </button>

              {isAdvancedOpen && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-mono text-white mb-2 block">
                      EDIT STRENGTH: {editStrength}%
                    </Label>
                    <Slider
                      value={[editStrength]}
                      onValueChange={([value]) => setEditStrength(value)}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-mono text-white mb-2 block">
                      MASK BLUR: {maskBlur}PX
                    </Label>
                    <Slider
                      value={[maskBlur]}
                      onValueChange={([value]) => setMaskBlur(value)}
                      min={0}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-mono text-white mb-2 block">
                      EXPAND MASK: {expandMask}PX
                    </Label>
                    <Slider
                      value={[expandMask]}
                      onValueChange={([value]) => setExpandMask(value)}
                      min={0}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center Panel - Canvas */}
          <div className="xl:col-span-2">
            <div className="bg-gradient-to-br from-black/60 via-gray-900/20 to-black/60 backdrop-blur-sm border-2 border-gray-400/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm font-bold font-mono text-white uppercase tracking-wide flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  CANVAS EDITOR
                </Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {tool.toUpperCase()}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(25, zoom - 25))}>
                      <ZoomOut className="w-3 h-3" />
                    </Button>
                    <span className="text-xs font-mono text-white w-12 text-center">{zoom}%</span>
                    <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(200, zoom + 25))}>
                      <ZoomIn className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="relative bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600 min-h-[400px] flex items-center justify-center">
                {showComparison && result ? (
                  <div className="flex w-full h-full">
                    <div className="flex-1 relative border-r border-gray-600">
                      <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-mono font-bold z-10">
                        BEFORE
                      </div>
                      <img
                        src={imageUrl}
                        alt="Original"
                        className="w-full h-full object-contain"
                        style={{ transform: `scale(${zoom / 100})` }}
                      />
                    </div>
                    <div className="flex-1 relative">
                      <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-mono font-bold z-10">
                        AFTER
                      </div>
                      <img
                        src={result}
                        alt="Result"
                        className="w-full h-full object-contain"
                        style={{ transform: `scale(${zoom / 100})` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      className="max-w-full max-h-[400px] border border-gray-600 rounded"
                      style={{ transform: `scale(${zoom / 100})` }}
                    />
                    <canvas
                      ref={maskCanvasRef}
                      className={`absolute top-0 left-0 cursor-crosshair transition-opacity ${
                        showMask ? 'opacity-100' : 'opacity-0'
                      }`}
                      style={{ transform: `scale(${zoom / 100})` }}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                    />
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded">
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-lg text-center border-2 border-purple-400">
                          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-white" />
                          <p className="text-sm font-mono font-bold text-white uppercase">AI PROCESSING...</p>
                          <p className="text-xs text-purple-200 font-mono">CONTROLNET + INPAINTING</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Prompts & Actions */}
          <div className="xl:col-span-1 space-y-4">
            {/* Quick Prompts */}
            <div className="bg-gradient-to-br from-black/60 via-pink-900/20 to-purple-900/20 backdrop-blur-sm border-2 border-pink-400/50 rounded-xl p-4">
              <Label className="text-sm font-bold font-mono text-white uppercase tracking-wide mb-3 block flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-pink-400" />
                QUICK PROMPTS
              </Label>

              <Tabs defaultValue="add" className="w-full">
                <TabsList className="grid w-full grid-cols-2 gap-1 bg-gray-800/50 p-1 mb-3">
                  <TabsTrigger value="add" className="text-xs font-mono">ADD</TabsTrigger>
                  <TabsTrigger value="change" className="text-xs font-mono">CHANGE</TabsTrigger>
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

            {/* Prompt Input */}
            <div className="bg-gradient-to-br from-black/60 via-blue-900/20 to-cyan-900/20 backdrop-blur-sm border-2 border-cyan-400/50 rounded-xl p-4">
              <Label className="text-sm font-bold font-mono text-white uppercase tracking-wide mb-3 block flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                EDIT PROMPT
              </Label>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-mono text-white mb-2 block">DESCRIBE CHANGES</Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="add a red ribbon, change to blue color..."
                    className="min-h-[80px] bg-gray-800/50 border-2 border-cyan-400/30 text-white placeholder-gray-400 font-mono text-xs resize-none"
                  />
                </div>

                <div>
                  <Label className="text-xs font-mono text-white mb-2 block">NEGATIVE PROMPT</Label>
                  <Textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="what to avoid..."
                    className="min-h-[60px] bg-gray-800/50 border-2 border-cyan-400/30 text-white placeholder-gray-400 font-mono text-xs resize-none"
                  />
                </div>

                <Button
                  onClick={processEdit}
                  disabled={!prompt.trim() || isProcessing}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 font-mono text-sm py-6 uppercase tracking-wide"
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
              </div>
            </div>

            {/* Results */}
            {result && (
              <div className="bg-gradient-to-br from-black/60 via-emerald-900/20 to-green-900/20 backdrop-blur-sm border-2 border-emerald-400/50 rounded-xl p-4">
                <Label className="text-sm font-bold font-mono text-white uppercase tracking-wide mb-3 block flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  RESULT ACTIONS
                </Label>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-mono text-white">SHOW COMPARISON</Label>
                    <Switch checked={showComparison} onCheckedChange={setShowComparison} />
                  </div>

                  <Button onClick={downloadResult} variant="outline" size="sm" className="w-full font-mono text-xs">
                    <Download className="w-3 h-3 mr-1" />
                    DOWNLOAD RESULT
                  </Button>

                  <Button 
                    onClick={saveToGalleryAndView}
                    size="sm" 
                    className="w-full font-mono text-xs bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    SAVE TO GALLERY & VIEW
                  </Button>

                  <Button 
                    onClick={handleSaveAndReturn}
                    variant="outline"
                    size="sm" 
                    className="w-full font-mono text-xs"
                  >
                    <ArrowLeft className="w-3 h-3 mr-1" />
                    SAVE & RETURN TO GENERATOR
                  </Button>

                  <Button variant="outline" size="sm" className="w-full font-mono text-xs">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    CONTINUE EDITING
                  </Button>
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
                <div className="text-cyan-300 mt-2">🎯 ControlNet preserves pose!</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
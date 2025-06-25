"use client";

import type React from "react";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload,
  X,
  ImageIcon,
  AlertTriangle,
  Star,
  Zap,
  User,
  Palette,
  Camera,
  Building,
  Loader2,
  FileWarning,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSound } from "@/contexts/sound-context";
import { ImageModal } from "@/components/image-modal";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { uploadImages } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { nanoid } from "nanoid";

interface FileWithPreview extends File {
  id: string;
  preview: string;
  progress: number;
  status: "uploading" | "completed" | "error";
  uploadedUrl?: string;
  sizeWarning?: boolean;
}

const SUBJECT_TYPES = [
  {
    id: "person",
    label: "Person",
    icon: User,
    description: "Faces, portraits, people",
  },
  {
    id: "style",
    label: "Art Style",
    icon: Palette,
    description: "Artistic styles, aesthetics",
  },
  {
    id: "object",
    label: "Object",
    icon: Camera,
    description: "Products, items, things",
  },
  {
    id: "concept",
    label: "Concept",
    icon: Building,
    description: "Brands, logos, concepts",
  },
];

// Size limits to work within Vercel's 4.5MB serverless function limit
const MAX_FILE_SIZE_MB = 1.5; // 1.5MB per file (reduced from 2MB)
const MAX_TOTAL_SIZE_MB = 4; // 4MB total (reduced from 8MB to stay under 4.5MB limit)
const MAX_FILES = 15; // Maximum 15 files allowed
const MIN_FILES = 10; // Minimum 10 files required for training

export default function ImageTrainingUploader() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string>("");
  const [sizeWarning, setSizeWarning] = useState<string>("");
  const [score, setScore] = useState(0);
  const [previousLevel, setPreviousLevel] = useState(1);
  const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [completedFiles, setCompletedFiles] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isStartingTraining, setIsStartingTraining] = useState(false);
  const { play, initialize } = useSound();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  // Training form state
  const [subjectName, setSubjectName] = useState("");
  const [subjectType, setSubjectType] = useState("person");
  const [showTrainingForm, setShowTrainingForm] = useState(false);

  // Keep track of active upload intervals for cleanup
  const activeIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Initialize sound system on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      initialize();
      document.removeEventListener("click", handleFirstInteraction);
    };

    document.addEventListener("click", handleFirstInteraction);

    return () => {
      document.removeEventListener("click", handleFirstInteraction);
    };
  }, [initialize]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      // Clear all active intervals when component unmounts
      activeIntervalsRef.current.forEach((interval) => {
        clearInterval(interval);
      });
      activeIntervalsRef.current.clear();
    };
  }, []);

  // Check file sizes and update warnings
  const checkFileSizes = (allFiles: FileWithPreview[]) => {
    const totalSizeBytes = allFiles.reduce((sum, file) => sum + file.size, 0);
    const totalSizeMB = totalSizeBytes / (1024 * 1024);

    const largeFiles = allFiles.filter(
      (file) => file.size / (1024 * 1024) > MAX_FILE_SIZE_MB
    );

    if (largeFiles.length > 0) {
      setSizeWarning(
        `⚠️ ${largeFiles.length} FILES OVER ${MAX_FILE_SIZE_MB}MB • TRAINING MAY TIMEOUT`
      );
    } else if (totalSizeMB > MAX_TOTAL_SIZE_MB) {
      setSizeWarning(
        `⚠️ TOTAL SIZE ${totalSizeMB.toFixed(
          1
        )}MB • RECOMMEND UNDER ${MAX_TOTAL_SIZE_MB}MB`
      );
    } else {
      setSizeWarning("");
    }
  };

  const validateFiles = (newFiles: FileWithPreview[]) => {
    const totalFiles = files.length + newFiles.length;

    // Check minimum files
    if (totalFiles < MIN_FILES) {
      setValidationMessage(
        `NEED ${
          MIN_FILES - totalFiles
        } MORE IMAGES • MINIMUM ${MIN_FILES} REQUIRED`
      );
      return true;
    }

    if (totalFiles > MAX_FILES) {
      setValidationMessage(
        `TOO MANY FILES! • MAXIMUM ${MAX_FILES} ALLOWED • WOULD BE: ${totalFiles}`
      );
      play("error");
      return false;
    }

    // Perfect amount
    if (totalFiles >= MIN_FILES) {
      setValidationMessage("");
      return true;
    }

    return true;
  };

  const processFiles = async (fileList: FileList) => {
    const validImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    // Check if adding these files would exceed the limit
    if (files.length + fileList.length > MAX_FILES) {
      const slotsAvailable = MAX_FILES - files.length;
      setValidationMessage(
        `ONLY ${slotsAvailable} SLOT${
          slotsAvailable !== 1 ? "S" : ""
        } REMAINING • MAXIMUM ${MAX_FILES} IMAGES ALLOWED`
      );
      play("error");
      toast({
        title: "Too Many Files",
        description: `You can only upload ${slotsAvailable} more image${
          slotsAvailable !== 1 ? "s" : ""
        }. Maximum is ${MAX_FILES} images total.`,
        variant: "destructive",
      });
      return;
    }

    const newFiles: FileWithPreview[] = Array.from(fileList)
      .filter((file) => validImageTypes.includes(file.type))
      .slice(0, MAX_FILES - files.length) // Only take what we can fit
      .map((file) => {
        const fileSizeMB = file.size / (1024 * 1024);
        const sizeWarning = fileSizeMB > MAX_FILE_SIZE_MB;

        // Start with uploading status and 0 progress
        return Object.assign(file, {
          id: nanoid(),
          preview: URL.createObjectURL(file),
          progress: 0,
          status: "uploading" as const,
          sizeWarning,
        }) as FileWithPreview;
      });

    if (newFiles.length === 0) {
      play("error");
      return;
    }

    // Add the files with uploading status
    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    setScore((prev) => prev + newFiles.length * 100);
    play("drop");

    // Update validation messages
    validateFiles(newFiles);
    checkFileSizes(updatedFiles);

    // Start uploading files individually
    uploadFilesToStorage(newFiles);
  };

  const uploadFilesToStorage = async (filesToUpload: FileWithPreview[]) => {
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];

      try {
        // Update progress to show starting
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, progress: 10, status: "uploading" as const }
              : f
          )
        );

        const actualFile = file as File;
        const urls = await uploadImages([actualFile]);

        // Update file as completed
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  status: "completed" as const,
                  progress: 100,
                  uploadedUrl: urls[0],
                }
              : f
          )
        );

        // Play completion sound for each file
        setScore((prevScore) => prevScore + 50);
        play("complete");
      } catch (error) {
        console.error(`Upload error for file ${file.name}:`, error);

        // Mark this specific file as failed
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: "error" as const, progress: 0 }
              : f
          )
        );

        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file.name}. You can try again.`,
          variant: "destructive",
        });
        play("error");
      }
    }

    // Update completed files count after all uploads
    setFiles((prev) => {
      const completedCount = prev.filter(
        (f) => f.status === "completed"
      ).length;
      setCompletedFiles(completedCount);
      checkFileSizes(prev); // Recalculate sizes
      return prev;
    });
  };

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!isDragOver) {
        play("hover");
        setIsDragOver(true);
      }
    },
    [isDragOver, play]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [files]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
  };

  const removeFile = (fileId: string) => {
    play("delete");

    setFiles((prev) => {
      const updatedFiles = prev.filter((file) => file.id !== fileId);
      setScore((prevScore) => Math.max(0, prevScore - 150));

      // Update validation messages
      if (updatedFiles.length < MIN_FILES) {
        setValidationMessage(
          `NEED ${
            MIN_FILES - updatedFiles.length
          } MORE IMAGES • MINIMUM ${MIN_FILES} REQUIRED`
        );
      } else {
        setValidationMessage("");
      }

      // Recheck sizes
      checkFileSizes(updatedFiles);

      return updatedFiles;
    });
  };

  const replaceFile = (fileId: string, newFile: File) => {
    play("upload");

    setFiles((prev) =>
      prev.map((file) => {
        if (file.id === fileId) {
          // Clean up old preview URL
          URL.revokeObjectURL(file.preview);

          const fileSizeMB = newFile.size / (1024 * 1024);
          const sizeWarning = fileSizeMB > MAX_FILE_SIZE_MB;

          const newFileWithPreview = Object.assign(newFile, {
            id: nanoid(),
            preview: URL.createObjectURL(newFile),
            progress: 0,
            status: "uploading" as const,
            sizeWarning,
          }) as FileWithPreview;

          // Upload the new file
          uploadFilesToStorage([newFileWithPreview]);

          return newFileWithPreview;
        }
        return file;
      })
    );
  };

  const openImageModal = (file: FileWithPreview) => {
    play("click");
    setSelectedFile(file);
    setIsModalOpen(true);
  };

  const closeImageModal = () => {
    play("click");
    setIsModalOpen(false);
    setSelectedFile(null);
  };

  const openFileDialog = () => {
    if (files.length >= MAX_FILES) {
      play("error");
      toast({
        title: "Upload Full",
        description: `You already have ${MAX_FILES} images. Remove some first.`,
        variant: "destructive",
      });
      return;
    }

    play("click");
    fileInputRef.current?.click();
  };

  const handleStartTraining = () => {
    if (files.length < MIN_FILES) {
      play("error");
      toast({
        title: "Incomplete Upload",
        description: `Please upload at least ${MIN_FILES} images (${files.length}/${MIN_FILES})`,
        variant: "destructive",
      });
      return;
    }

    play("click");
    setShowTrainingForm(true);
  };

  const startTraining = async () => {
    if (!subjectName.trim()) {
      play("error");
      toast({
        title: "Missing Subject Name",
        description: "Please enter a name for your training subject.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to start training.",
        variant: "destructive",
      });
      return;
    }

    if (files.length < MIN_FILES) {
      toast({
        title: "Incomplete Upload",
        description: `Please upload at least ${MIN_FILES} images (${files.length}/${MIN_FILES})`,
        variant: "destructive",
      });
      return;
    }

    setIsStartingTraining(true);
    play("levelUp");

    try {
      // Get the uploaded URLs from completed files
      const imageUrls = files
        .filter((f) => f.status === "completed" && f.uploadedUrl)
        .map((f) => f.uploadedUrl!);

      if (imageUrls.length < MIN_FILES) {
        throw new Error(`Need at least ${MIN_FILES} completed uploads`);
      }

      console.log("🚀 Starting training with:", {
        subjectName,
        subjectType,
        imageCount: imageUrls.length,
        userId: user.id,
      });

      // Call the training API
      const response = await fetch("/api/train", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrls,
          subjectName,
          subjectType,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start training");
      }

      console.log("✅ Training started:", data);

      toast({
        title: "Training Started! 🚀",
        description: `Training "${subjectName}" with ${imageUrls.length} images`,
      });

      // Redirect to the training page
      router.push(`/dashboard/${data.trainingId}`);
    } catch (error) {
      console.error("💥 Training start error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      toast({
        title: "Training Failed",
        description: errorMessage,
        variant: "destructive",
      });

      play("error");
    } finally {
      setIsStartingTraining(false);
    }
  };

  const level = Math.floor(completedFiles / 2) + 1;

  // Check for level up
  useEffect(() => {
    if (level > previousLevel) {
      play("levelUp");
      setPreviousLevel(level);
    }
  }, [level, previousLevel, play]);

  // Calculate total size for display - only include actual files, not broken ones
  const totalSizeBytes = files.reduce((sum, file) => {
    // Only count files that have valid size
    return sum + (file.size || 0);
  }, 0);
  const totalSizeMB = totalSizeBytes / (1024 * 1024);

  // Calculate upload progress
  const uploadingFilesCount = files.filter(
    (f) => f.status === "uploading"
  ).length;
  const failedFilesCount = files.filter((f) => f.status === "error").length;

  // Show training form if requested
  if (showTrainingForm) {
    return (
      <div className="w-full min-h-screen bg-black p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-900 p-6 rounded-lg border-4 border-gray-700 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 uppercase tracking-wider">
                ⚡ TRAINING SETUP ⚡
              </h2>
              <p className="text-gray-400 font-mono text-sm mt-2">
                Configure your AI model training parameters
              </p>
            </div>

            <div className="space-y-6">
              {/* Subject Name */}
              <div>
                <label className="block text-cyan-400 font-mono text-sm font-bold mb-2 uppercase tracking-wide">
                  Subject Name
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g., 'My Dog', 'Company Logo', 'Portrait Style'"
                  className="w-full px-4 py-3 bg-black border-2 border-gray-600 rounded-lg text-white font-mono focus:border-cyan-400 focus:outline-none"
                  maxLength={50}
                />
                <p className="text-gray-500 text-xs mt-1 font-mono">
                  This will be the name of your custom AI model
                </p>
              </div>

              {/* Subject Type */}
              <div>
                <label className="block text-cyan-400 font-mono text-sm font-bold mb-3 uppercase tracking-wide">
                  Subject Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SUBJECT_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => {
                          setSubjectType(type.id);
                          play("click");
                        }}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                          subjectType === type.id
                            ? "border-purple-400 bg-purple-900/30 text-purple-300"
                            : "border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500"
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className="w-5 h-5" />
                          <span className="font-mono font-bold text-sm uppercase tracking-wide">
                            {type.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono">
                          {type.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* File Summary */}
              <div className="bg-black border-2 border-gray-600 rounded-lg p-4">
                <h3 className="text-yellow-400 font-mono text-sm font-bold mb-2 uppercase tracking-wide">
                  Training Data Summary
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-green-400 font-mono text-xl font-bold">
                      {completedFiles}
                    </div>
                    <div className="text-gray-400 font-mono text-xs uppercase">
                      Ready
                    </div>
                  </div>
                  <div>
                    <div className="text-cyan-400 font-mono text-xl font-bold">
                      {isNaN(totalSizeMB) ? "0.0" : totalSizeMB.toFixed(1)}MB
                    </div>
                    <div className="text-gray-400 font-mono text-xs uppercase">
                      Total Size
                    </div>
                  </div>
                  <div>
                    <div className="text-red-400 font-mono text-xl font-bold">
                      {failedFilesCount}
                    </div>
                    <div className="text-gray-400 font-mono text-xs uppercase">
                      Failed
                    </div>
                  </div>
                </div>
              </div>

              {/* Size Warning */}
              {sizeWarning && (
                <div className="bg-yellow-900/40 border-2 border-yellow-400/50 rounded-lg p-4">
                  <div className="text-yellow-400 font-mono text-sm font-bold mb-2 flex items-center gap-2">
                    <FileWarning className="w-4 h-4" />
                    SIZE WARNING
                  </div>
                  <div className="text-yellow-300 font-mono text-xs">
                    {sizeWarning}
                  </div>
                  <div className="text-yellow-200 font-mono text-xs mt-1">
                    Large files may cause training to timeout. Consider resizing
                    images.
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => {
                    play("click");
                    setShowTrainingForm(false);
                  }}
                  variant="outline"
                  className="bg-gray-800 border-2 border-gray-600 text-gray-300 hover:bg-gray-700 font-mono uppercase tracking-wide"
                >
                  ← Back to Upload
                </Button>
                <Button
                  onClick={startTraining}
                  disabled={!subjectName.trim() || isStartingTraining}
                  className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold font-mono uppercase tracking-wider px-8 py-3 text-lg border-2 border-purple-400 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                >
                  {isStartingTraining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Starting...
                    </>
                  ) : (
                    "🚀 Start Training"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
                ★ NEURAL TRAINING ★
              </h1>
            </div>
          </div>
          <div className="flex justify-center items-center gap-4 text-green-400 font-mono text-sm">
            <span>MISSION</span>
            <span className="animate-pulse">●</span>
            <span>UPLOAD {MAX_FILES} IMAGES</span>
          </div>
        </div>

        {/* Game Stats HUD */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {/* Score */}
          <div className="bg-black border-2 border-yellow-400 p-2 sm:p-3 rounded font-mono">
            <div className="text-yellow-400 text-xs uppercase tracking-wide">
              Score
            </div>
            <div className="text-yellow-300 text-lg sm:text-xl font-bold">
              {score.toLocaleString()}
            </div>
          </div>

          {/* Level */}
          <div className="bg-black border-2 border-green-400 p-2 sm:p-3 rounded font-mono">
            <div className="text-green-400 text-xs uppercase tracking-wide">
              Level
            </div>
            <div className="text-green-300 text-lg sm:text-xl font-bold">
              {level}
            </div>
          </div>

          {/* Files */}
          <div className="bg-black border-2 border-pink-400 p-2 sm:p-3 rounded font-mono">
            <div className="text-pink-400 text-xs uppercase tracking-wide">
              Files
            </div>
            <div className="text-pink-300 text-lg sm:text-xl font-bold">
              {files.length}/{MIN_FILES}
            </div>
          </div>

          {/* Size */}
          <div className="bg-black border-2 border-cyan-400 p-2 sm:p-3 rounded font-mono">
            <div className="text-cyan-400 text-xs uppercase tracking-wide">
              Size
            </div>
            <div
              className={`text-lg sm:text-xl font-bold ${
                totalSizeMB > MAX_TOTAL_SIZE_MB
                  ? "text-red-300"
                  : "text-cyan-300"
              }`}
            >
              {isNaN(totalSizeMB) ? "0.0" : totalSizeMB.toFixed(1)}MB
            </div>
            {uploadingFilesCount > 0 && (
              <div className="text-cyan-200 text-xs">
                {uploadingFilesCount} uploading...
              </div>
            )}
          </div>
        </div>

        {/* Size Warning Alert */}
        {sizeWarning && (
          <div className="mb-6 bg-yellow-900 border-2 border-yellow-400 p-3 sm:p-4 rounded font-mono">
            <div className="flex items-center gap-2 mb-2">
              <FileWarning className="h-5 w-5 text-yellow-400 animate-pulse flex-shrink-0" />
              <span className="text-yellow-300 text-xs sm:text-sm font-bold uppercase tracking-wide">
                SIZE WARNING
              </span>
            </div>
            <div className="text-yellow-200 text-xs">{sizeWarning}</div>
            <div className="text-yellow-100 text-xs mt-1">
              💡 TIP: Resize images to under {MAX_FILE_SIZE_MB}MB each to
              prevent training timeouts
            </div>
          </div>
        )}

        {/* Validation Alert - Retro Style */}
        {validationMessage && (
          <div className="mb-6 bg-red-900 border-2 border-red-400 p-3 sm:p-4 rounded font-mono">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400 animate-pulse flex-shrink-0" />
              <span className="text-red-300 text-xs sm:text-sm uppercase tracking-wide">
                {validationMessage}
              </span>
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
              files.length >= MAX_FILES
                ? "border-gray-500 bg-gray-800/50 cursor-not-allowed opacity-50"
                : isDragOver
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
            disabled={files.length >= MAX_FILES}
          />

          <div className="space-y-4 sm:space-y-6">
            {/* Retro Upload Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 border-4 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    files.length >= MAX_FILES
                      ? "border-gray-500 bg-gray-700"
                      : uploadingFilesCount > 0
                      ? "border-pink-400 bg-pink-500/20 animate-bounce"
                      : "border-gray-500 bg-gray-800"
                  }`}
                >
                  {files.length >= MAX_FILES ? (
                    <X className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                  ) : uploadingFilesCount > 0 ? (
                    <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400 animate-spin" />
                  ) : (
                    <Upload
                      className={`w-8 h-8 sm:w-10 sm:h-10 ${
                        isDragOver ? "text-pink-400" : "text-gray-400"
                      }`}
                    />
                  )}
                </div>
                {/* Pixel corners */}
                {files.length < MAX_FILES && (
                  <>
                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-cyan-400"></div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-400"></div>
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-yellow-400"></div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400"></div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-bold text-white uppercase tracking-wider">
                {files.length >= MAX_FILES
                  ? ">>> UPLOAD COMPLETE <<<"
                  : isDragOver
                  ? ">>> DROP FILES HERE <<<"
                  : files.length === 0
                  ? "UPLOAD 10-15 IMAGES"
                  : files.length < MIN_FILES
                  ? `ADD ${MIN_FILES - files.length} MORE IMAGES`
                  : `ADD ${MAX_FILES - files.length} MORE IMAGES`}
              </h3>
              <p className="text-gray-400 uppercase text-xs sm:text-sm tracking-wide">
                {files.length >= MAX_FILES
                  ? "READY FOR TRAINING"
                  : "DRAG & DROP OR " +
                    (files.length === 0 ? "" : "") +
                    "PRESS TO BROWSE"}
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <div>SUPPORTED: JPG • PNG • GIF • WEBP</div>
                <div>
                  MINIMUM {MIN_FILES} • MAXIMUM {MAX_FILES} IMAGES
                </div>
                <div>RECOMMENDED: UNDER {MAX_FILE_SIZE_MB}MB PER IMAGE</div>
                <div>TOTAL SIZE: UNDER {MAX_TOTAL_SIZE_MB}MB RECOMMENDED</div>
              </div>

              {/* Training Guidelines */}
              <div className="mt-3 bg-gray-800/30 border border-gray-700/50 rounded p-3">
                <div className="text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-bold">
                    <Zap className="w-3 h-3" />
                    OPTIMAL TRAINING GUIDE
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-400">
                    <div>• 1024×1024px ideal size</div>
                    <div>• Clear, well-lit subject</div>
                    <div>• Consistent style/lighting</div>
                    <div>• Multiple angles/poses</div>
                    <div>• Simple backgrounds</div>
                    <div>• Descriptive file names</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* File Grid - Game Inventory Style */}
        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="text-lg font-bold font-mono text-white uppercase tracking-wide flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                TRAINING SET [{files.length}/{MIN_FILES}]
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  play("click");
                  setFiles([]);
                  setScore(0);
                  setValidationMessage("");
                  setSizeWarning("");
                }}
                className="bg-red-900 border-red-400 text-red-300 hover:bg-red-800 font-mono text-xs uppercase tracking-wide"
              >
                CLEAR ALL
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
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

                  {/* Size Warning Indicator */}
                  {file.sizeWarning && (
                    <div className="absolute top-1 left-8 bg-yellow-500 text-black text-xs font-mono px-1 rounded z-10">
                      !
                    </div>
                  )}

                  {/* Thumbnail */}
                  <div className="aspect-square relative overflow-hidden">
                    <img
                      src={file.preview || "/placeholder.svg"}
                      alt="Uploaded image"
                      className="w-full h-full object-cover"
                    />

                    {/* Status Icons */}
                    {file.status === "completed" && (
                      <div className="absolute top-1 right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded flex items-center justify-center group-hover:opacity-0 transition-opacity duration-200">
                        <Star className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" />
                      </div>
                    )}

                    {file.status === "uploading" && (
                      <div className="absolute top-1 right-1 w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded flex items-center justify-center animate-spin group-hover:opacity-0 transition-opacity duration-200">
                        <Zap className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" />
                      </div>
                    )}

                    {file.status === "error" && (
                      <div className="absolute top-1 right-1 w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded flex items-center justify-center group-hover:opacity-0 transition-opacity duration-200">
                        <AlertTriangle className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" />
                      </div>
                    )}

                    {/* Click to View Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                      <div className="text-white font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black bg-opacity-75 px-2 py-1 rounded">
                        VIEW
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                      className="absolute top-1 right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 border-2 border-red-400 hover:border-red-300 shadow-lg"
                      title="Delete image"
                    >
                      <X className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" />
                    </button>
                  </div>

                  {/* Progress Bar */}
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
                </div>
              ))}

              {/* Empty Slots */}
              {Array.from({ length: MAX_FILES - files.length }).map(
                (_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="aspect-square bg-gray-800/30 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center"
                  >
                    <div className="text-gray-500 font-mono text-xs">
                      {files.length + index + 1}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Action Buttons - Arcade Style */}
        {files.length >= MIN_FILES && completedFiles === files.length && (
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={handleStartTraining}
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-black font-bold font-mono uppercase tracking-wider px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg border-2 border-green-400 shadow-lg shadow-green-500/25"
            >
              ⚡ START TRAINING
            </Button>
          </div>
        )}

        {/* Progress Indicator when under 10 files */}
        {files.length < MIN_FILES && (
          <div className="mt-8 text-center">
            <div className="bg-gray-800 border-2 border-gray-600 p-4 rounded-lg font-mono">
              <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">
                MISSION PROGRESS
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="text-yellow-400 text-2xl font-bold">
                  {files.length}
                </div>
                <div className="text-gray-500">/</div>
                <div className="text-green-400 text-2xl font-bold">
                  {MIN_FILES}
                </div>
              </div>
              <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-500"
                  style={{ width: `${(files.length / MIN_FILES) * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 uppercase">
                {files.length === 0
                  ? "START YOUR MISSION"
                  : `${MIN_FILES - files.length} MORE TO UNLOCK TRAINING`}
              </div>
            </div>
          </div>
        )}

        {/* Show when you have files but not all completed */}
        {files.length >= MIN_FILES && completedFiles < MIN_FILES && (
          <div className="mt-8 text-center">
            <div className="bg-yellow-900 border-2 border-yellow-400 p-4 rounded-lg font-mono">
              <div className="text-yellow-400 text-sm uppercase tracking-wide mb-2">
                UPLOADING IN PROGRESS
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="text-yellow-400 text-2xl font-bold">
                  {completedFiles}
                </div>
                <div className="text-gray-500">/</div>
                <div className="text-green-400 text-2xl font-bold">
                  {MIN_FILES}
                </div>
                <div className="text-gray-500 text-sm">COMPLETED</div>
              </div>
              <div className="text-xs text-yellow-300 uppercase animate-pulse">
                WAIT FOR ALL UPLOADS TO COMPLETE
              </div>
            </div>
          </div>
        )}

        {/* Error files warning - only show for actually failed files */}
        {failedFilesCount > 0 && (
          <div className="mt-4 bg-red-900/40 border-2 border-red-400/50 rounded-lg p-4">
            <div className="text-red-400 font-mono text-sm text-center">
              ⚠️ {failedFilesCount} FILE
              {failedFilesCount > 1 ? "S" : ""} FAILED TO UPLOAD
            </div>
            <div className="text-red-300 font-mono text-xs text-center mt-1">
              Please remove failed files and try uploading them again
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
        />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AIImageGenerator from "@/components/ai-image-generator";
import { useSound } from "@/contexts/sound-context";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";

interface EditedImage {
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

const convertToGeneratedImage = (image: EditedImage | null) => {
  if (!image) return undefined;
  return {
    ...image,
    timestamp: image.timestamp.toISOString(),
    settings: {
      ...image.settings,
      seed: image.settings.seed || 0,
    },
  };
};

export default function GeneratePage() {
  const router = useRouter();
  const { initialize: initializeSounds, play: playSound } = useSound();
  const [isLoading, setIsLoading] = useState(true);
  const [editedImage, setEditedImage] = useState<EditedImage | null>(null);

  useEffect(() => {
    initializeSounds();

    const storedEditedImage = sessionStorage.getItem("editedImage");
    if (storedEditedImage) {
      try {
        const parsedImage = JSON.parse(storedEditedImage);
        setEditedImage(parsedImage);
        sessionStorage.removeItem("editedImage");
        if (playSound) playSound("complete");
        toast.info("Edited image loaded into generator.");
      } catch (error) {
        console.error("Failed to parse edited image:", error);
        toast.error("Could not load edited image data.");
      }
    }
    setIsLoading(false);
  }, [initializeSounds, playSound]);

  const handleBack = useCallback(() => {
    if (playSound) playSound("click");
    router.push("/training");
  }, [router, playSound]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center space-y-4 p-8 bg-gray-900/50 border-2 border-purple-500/50 rounded-xl shadow-xl">
          <div className="w-16 h-16 border-4 border-t-transparent border-purple-400 rounded-full animate-spin mx-auto"></div>
          <div className="text-purple-300 font-mono text-xl uppercase tracking-wider animate-pulse">
            LOADING AI GENERATOR
          </div>
          <p className="text-gray-400 font-mono text-sm">
            Preparing the creative matrix...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black">
        <AIImageGenerator
          onBack={handleBack}
          editedImage={convertToGeneratedImage(editedImage)}
        />
      </div>
    </ProtectedRoute>
  );
}

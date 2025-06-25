"use client";

import type React from "react";

import { useState, useRef } from "react";
import { X, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSound } from "@/contexts/sound-context";

interface FileWithPreview extends File {
  id: string;
  preview: string;
  progress: number;
  status: "uploading" | "completed" | "error";
}

interface ImageModalProps {
  file: FileWithPreview;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onReplace: (id: string, file: File) => void;
  playSound?: (sound: string) => void; // Optional for backward compatibility
}

export function ImageModal({
  file,
  isOpen,
  onClose,
  onDelete,
  onReplace,
}: ImageModalProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { play } = useSound();

  if (!isOpen) return null;

  const toggleZoom = () => {
    play("click");
    setIsZoomed(!isZoomed);
  };

  const handleDelete = () => {
    play("delete");
    onDelete(file.id);
    onClose();
  };

  const handleReplace = () => {
    play("click");
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onReplace(file.id, e.target.files[0]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80">
      <div
        className={`bg-gray-900 border-4 border-gray-700 rounded-lg overflow-hidden max-w-4xl w-full mx-auto transition-all duration-300 ${
          isZoomed ? "max-h-full h-full" : "max-h-[90vh]"
        }`}
      >
        {/* Modal Header */}
        <div className="bg-black p-4 flex items-center justify-between border-b border-gray-700">
          <h3 className="text-white font-mono font-bold uppercase tracking-wider">
            Image Preview
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Container */}
        <div
          className={`relative overflow-auto ${
            isZoomed ? "h-[calc(100%-8rem)]" : "max-h-[60vh]"
          } flex items-center justify-center bg-black bg-opacity-50`}
          onClick={toggleZoom}
        >
          <img
            src={file.preview || "/placeholder.svg"}
            alt="Uploaded image"
            className={`${
              isZoomed
                ? "max-w-none max-h-none cursor-zoom-out"
                : "max-w-full max-h-[60vh] cursor-zoom-in"
            } object-contain`}
          />
          {isZoomed && (
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded font-mono">
              Click to zoom out
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-800 p-4 border-t border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            {/* File Status */}
            <div className="text-gray-300 font-mono text-sm">
              <div>
                <span className="text-gray-500">Status:</span>{" "}
                <span
                  className={
                    file.status === "completed"
                      ? "text-green-400"
                      : file.status === "uploading"
                      ? "text-yellow-400"
                      : "text-red-400"
                  }
                >
                  {file.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReplace}
                className="bg-blue-900 border-blue-400 text-blue-300 hover:bg-blue-800 font-mono text-xs uppercase tracking-wide"
              >
                <Upload className="w-4 h-4 mr-1" /> Replace
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="bg-red-900 border-red-400 text-red-300 hover:bg-red-800 font-mono text-xs uppercase tracking-wide"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

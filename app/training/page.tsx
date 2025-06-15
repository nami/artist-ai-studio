"use client"

import ImageTrainingUploader from "@/components/features/training/image-training-uploader"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function TrainingPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black">
        <ImageTrainingUploader />
      </div>
    </ProtectedRoute>
  )
}
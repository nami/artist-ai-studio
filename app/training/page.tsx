"use client"

import ImageTrainingUploader from "@/components/features/training/image-training-uploader"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function TrainingPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4 bg-transparent">
        <ImageTrainingUploader />
      </div>
    </ProtectedRoute>
  )
}

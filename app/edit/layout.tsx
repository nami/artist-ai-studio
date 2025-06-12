import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI Image Editor - Edit Your Creations",
  description: "Advanced AI-powered image editing with inpainting, outpainting, and more",
}

export default function EditLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

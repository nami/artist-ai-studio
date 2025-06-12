import type React from "react"

export const metadata = {
  title: "AI Art Studio - Gallery",
  description: "Browse your AI-generated artwork collection",
}

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

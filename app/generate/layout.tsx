import type React from "react"

export const metadata = {
  title: "Artist AI Studio - Generate Images",
  description: "Generate AI images that are trained on your own images",
}

export default function GenerateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

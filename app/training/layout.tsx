import type React from "react"
export const metadata = {
  title: "AI Art Studio - Training",
  description: "Train your AI model with your own images",
}

export default function TrainingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

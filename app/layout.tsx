import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { SoundProvider } from "@/contexts/sound-context"
import { GlobalNavigation } from "@/components/global-navigation"
import { RetroSpaceBackground } from "@/components/retro-space-background"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "AI Artist Studio - Image Generator",
  description: "Create and edit AI-generated images with your own images",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="bg-black min-h-screen">
        <SoundProvider>
          <RetroSpaceBackground />
          <GlobalNavigation />
          <main className="relative z-10 min-h-screen">{children}</main>
          <Toaster />
        </SoundProvider>
      </body>
    </html>
  )
}

import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SoundProvider } from "@/contexts/sound-context"
import { GlobalNavigation } from "@/components/global-navigation"
import { RetroSpaceBackground } from "@/components/retro-space-background"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Artist AI Studio",
  description: "Transform your images into AI-powered creations",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
      { url: '/web-app-manifest-192x192.png', type: 'image/png', sizes: '192x192' },
      { url: '/web-app-manifest-512x512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <SoundProvider>
          <RetroSpaceBackground />
          <GlobalNavigation />
          {/* Added pt-16 to account for the fixed navbar height (h-16 = 64px) */}
          <main className="relative z-10 min-h-screen pt-16">{children}</main>
          <Toaster />
        </SoundProvider>
      </body>
    </html>
  )
}
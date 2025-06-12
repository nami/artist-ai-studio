"use client"

import type React from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast font-mono text-foreground bg-black/80 backdrop-blur-md border-2 shadow-lg rounded-lg text-sm p-4 !w-auto max-w-[350px]",
          title: "font-bold uppercase tracking-wider",
          description: "text-gray-400",
          actionButton:
            "group-[.toast]:bg-purple-800/70 group-[.toast]:hover:bg-purple-700/70 group-[.toast]:text-purple-200 group-[.toast]:border-purple-500/50 group-[.toast]:border",
          cancelButton:
            "group-[.toast]:bg-gray-700/70 group-[.toast]:hover:bg-gray-600/70 group-[.toast]:text-gray-300 group-[.toast]:border-gray-600/50 group-[.toast]:border",
          // Custom styles for different toast types
          success: "border-green-400/50 shadow-green-500/10 [&>[data-icon]]:text-green-400",
          info: "border-cyan-400/50 shadow-cyan-500/10 [&>[data-icon]]:text-cyan-400",
          warning: "border-yellow-400/50 shadow-yellow-500/10 [&>[data-icon]]:text-yellow-400",
          error: "border-red-400/50 shadow-red-500/10 [&>[data-icon]]:text-red-400",
          loading: "border-purple-400/50 shadow-purple-500/10 [&>[data-icon]]:text-purple-400",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

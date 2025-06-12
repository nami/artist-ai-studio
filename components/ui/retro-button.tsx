"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface RetroButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "danger" | "success" | "warning"
  size?: "sm" | "md" | "lg"
  icon?: LucideIcon
  disabled?: boolean
  className?: string
}

export function RetroButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  icon: Icon,
  disabled,
  className,
}: RetroButtonProps) {
  const variants = {
    primary:
      "bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-2 border-purple-400/50 text-purple-300 hover:bg-purple-800/50",
    secondary: "bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50",
    danger: "bg-red-900/50 border-red-400/50 text-red-300 hover:bg-red-800/80",
    success: "bg-green-900/50 border-green-400/50 text-green-300 hover:bg-green-800/80",
    warning: "bg-yellow-900/50 border-yellow-400/50 text-yellow-300 hover:bg-yellow-800/80",
  }

  const sizes = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-2",
    lg: "text-lg px-6 py-3",
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "font-mono uppercase tracking-wide hover:scale-110 transition-all",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </Button>
  )
}

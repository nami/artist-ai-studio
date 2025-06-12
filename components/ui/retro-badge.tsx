"use client"

import type React from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface RetroBadgeProps {
  children: React.ReactNode
  variant?: "default" | "gradient" | "pulsing"
  className?: string
}

export function RetroBadge({ children, variant = "default", className }: RetroBadgeProps) {
  const variants = {
    default: "bg-purple-400/20 text-purple-400 border-purple-400/50",
    gradient: "bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-purple-300 border-purple-400/50",
    pulsing: "bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-purple-300 border-purple-400/50 animate-bounce",
  }

  return <Badge className={cn("font-mono text-xs", variants[variant], className)}>{children}</Badge>
}

"use client"

import { useEffect, useRef } from "react"

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  color: string
  opacity: number
  twinkleSpeed: number
  twinkleOffset: number
}

export function RetroSpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Retro space colors - classic synthwave/retro gaming palette
    const colors = [
      "#ff6b9d", // Hot pink
      "#c44569", // Dark pink
      "#f8b500", // Amber
      "#00d2d3", // Cyan
      "#ff9ff3", // Light pink
      "#54a0ff", // Blue
      "#5f27cd", // Purple
      "#00d8ff", // Bright cyan
      "#feca57", // Yellow
      "#ff3838", // Red
    ]

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const createParticles = () => {
      const particles: Particle[] = []
      const particleCount = Math.min(50, Math.floor((canvas.width * canvas.height) / 15000)) // Responsive particle count

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 3 + 1, // 1-4px particles
          speedX: (Math.random() - 0.5) * 0.5, // Very slow horizontal movement
          speedY: (Math.random() - 0.5) * 0.5, // Very slow vertical movement
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: Math.random() * 0.8 + 0.2, // 0.2 to 1.0 opacity
          twinkleSpeed: Math.random() * 0.02 + 0.01, // Twinkling speed
          twinkleOffset: Math.random() * Math.PI * 2, // Random starting phase
        })
      }

      particlesRef.current = particles
    }

    const animate = (time: number) => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)" // Very subtle trail effect
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach((particle) => {
        // Update position
        particle.x += particle.speedX
        particle.y += particle.speedY

        // Wrap around screen edges
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        // Calculate twinkling effect
        const twinkle = Math.sin(time * particle.twinkleSpeed + particle.twinkleOffset)
        const currentOpacity = particle.opacity * (0.3 + 0.7 * ((twinkle + 1) / 2))

        // Draw particle with glow effect
        ctx.save()

        // Outer glow
        ctx.globalAlpha = currentOpacity * 0.3
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2)
        ctx.fill()

        // Inner bright core
        ctx.globalAlpha = currentOpacity
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()

        // Bright center pixel
        ctx.globalAlpha = currentOpacity * 1.5
        ctx.fillStyle = "#ffffff"
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size * 0.3, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    // Initialize
    resizeCanvas()
    createParticles()
    animate(0)

    // Handle resize
    const handleResize = () => {
      resizeCanvas()
      createParticles()
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }} />
}

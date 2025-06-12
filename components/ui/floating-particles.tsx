"use client"

interface FloatingParticlesProps {
  count?: number
  colors?: string[]
}

export function FloatingParticles({
  count = 25,
  colors = ["#ff6b9d", "#c44569", "#f8b500", "#00d2d3", "#ff9ff3", "#54a0ff"],
}: FloatingParticlesProps) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-pulse opacity-40"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 8 + 4}px`,
            height: `${Math.random() * 8 + 4}px`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 4}s`,
          }}
        />
      ))}
    </div>
  )
}

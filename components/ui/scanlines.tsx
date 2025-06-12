"use client"

export function Scanlines() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-10">
      <div
        className="h-full w-full"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #00ff00 2px, #00ff00 4px)",
        }}
      />
    </div>
  )
}

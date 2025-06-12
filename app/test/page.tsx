"use client"

import { useEffect } from "react"

export default function TestPage() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = "/edit"
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex h-screen items-center justify-center bg-black">
      <div className="text-center">
        <h1 className="text-2xl text-white">Test Page</h1>
        <p className="text-white">If you can see this, routing is working!</p>
        <p className="text-white mt-4">Redirecting to edit page...</p>
      </div>
    </div>
  )
} 
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/hooks/use-auth'
import { useSound } from '@/contexts/sound-context'
import { cn } from '@/lib/utils'

// Get the correct type from the sound context
type SoundEffect = Parameters<ReturnType<typeof useSound>['play']>[0]

// Simplified styles
const styles = {
  input: "w-full px-4 py-2 bg-gray-900 border-2 border-gray-800 text-white font-mono text-sm focus:outline-none transition-colors rounded-lg focus:border-cyan-400",
  button: "relative w-full bg-gray-900/90 border-2 border-gray-600 rounded-lg py-2 text-cyan-400 hover:border-cyan-400 hover:text-white font-mono text-sm uppercase tracking-wider transition-all duration-200",
  disabledButton: "relative w-full bg-gray-900/50 border-2 border-gray-700 rounded-lg py-2 text-gray-500 font-mono text-sm uppercase tracking-wider cursor-not-allowed",
}

// Modal component moved outside to prevent recreation
const AuthModal = ({ 
  isOpen, 
  onClose, 
  onSwitch,
  type, 
  onSubmit, 
  onOAuth, 
  isSubmitting, 
  error,
  playSound 
}: {
  isOpen: boolean
  onClose: () => void
  onSwitch: () => void
  type: 'signin' | 'signup'
  onSubmit: (email: string, password: string) => void
  onOAuth: (provider: 'github' | 'google') => void
  isSubmitting: boolean
  error: string
  playSound: (sound: SoundEffect) => void
}) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setEmail('')
      setPassword('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const isFormValid = email.includes('@') && email.length > 0 && password.length > 0 && !isSubmitting

  const handleSubmit = () => {
    if (isFormValid) {
      onSubmit(email, password)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isFormValid) {
      handleSubmit()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[99999]"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-auto bg-black rounded-xl border-2 border-gray-700 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-800 transition-colors"
          onMouseEnter={() => playSound('hover')}
        >
          <svg className="w-5 h-5 text-gray-400 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-mono font-bold mb-6 text-center text-white uppercase tracking-wider">
          {type === 'signin' ? '🔐 Sign In' : '🚀 Sign Up'}
        </h2>

        {/* Email Input */}
        <div className="mb-4">
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            className={styles.input}
            disabled={isSubmitting}
            autoComplete="email"
          />
        </div>

        {/* Password Input */}
        <div className="mb-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            className={styles.input}
            disabled={isSubmitting}
            autoComplete="current-password"
          />
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm font-mono text-center">{error}</p>
          </div>
        )}
        
        {/* Submit Button */}
        <button
          type="button"
          disabled={!isFormValid}
          onClick={handleSubmit}
          className={isFormValid ? styles.button : styles.disabledButton}
          onMouseEnter={() => isFormValid && playSound('hover')}
        >
          {isSubmitting ? '⏳ Processing...' : type === 'signin' ? '🔓 Sign In' : '✨ Create Account'}
        </button>

        {/* OAuth Section */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-black text-gray-400 font-mono">OR CONTINUE WITH</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <button
              onClick={() => onOAuth('github')}
              type="button"
              className={styles.button}
              onMouseEnter={() => !isSubmitting && playSound('hover')}
              disabled={isSubmitting}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </div>
            </button>

            <button
              onClick={() => onOAuth('google')}
              type="button"
              className={styles.button}
              onMouseEnter={() => !isSubmitting && playSound('hover')}
              disabled={isSubmitting}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Google
              </div>
            </button>
            
            <div className="text-xs text-gray-500 font-mono text-center mt-2">
              Note: OAuth providers need to be configured in Supabase
            </div>
          </div>
        </div>

        {/* Switch Modal Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm font-mono">
            {type === 'signin' ? "Don't have an account?" : "Already have an account?"}
            {' '}
            <button
              onClick={() => {
                playSound('hover')
                onSwitch()
              }}
              className="text-cyan-400 hover:text-cyan-300 transition-colors underline"
              onMouseEnter={() => playSound('hover')}
              disabled={isSubmitting}
            >
              {type === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function AuthModals({
  buttonClassName,
  iconClassName,
  textClassName,
}: {
  buttonClassName?: string;
  iconClassName?: string;
  textClassName?: string;
} = {}) {
  const { signIn, signUp, signInWithProvider } = useAuth()
  const { play } = useSound()
  const [isSignInOpen, setIsSignInOpen] = useState(false)
  const [isSignUpOpen, setIsSignUpOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  // Fix hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent body scroll
  useEffect(() => {
    if (isSignInOpen || isSignUpOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isSignInOpen, isSignUpOpen])

  const handleSubmit = useCallback(async (email: string, password: string, type: 'signin' | 'signup') => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    setError('')
    
    try {
      play('click')
      
      if (type === 'signin') {
        await signIn(email, password)
        setIsSignInOpen(false)
      } else {
        await signUp(email, password)
        setIsSignUpOpen(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }, [signIn, signUp, play, isSubmitting])

  const handleOAuth = useCallback(async (provider: 'github' | 'google') => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    setError('')
    
    try {
      play('click')
      await signInWithProvider(provider)
    } catch (err) {
      console.error(`${provider} OAuth error:`, err)
      if (err instanceof Error && err.message.includes('not enabled')) {
        setError(`${provider === 'github' ? 'GitHub' : 'Google'} sign-in is not configured`)
      } else {
        setError(err instanceof Error ? err.message : `${provider === 'github' ? 'GitHub' : 'Google'} sign-in failed`)
      }
      setIsSubmitting(false)
    }
  }, [signInWithProvider, play, isSubmitting])

  // Close functions - these actually close the modals
  const closeSignIn = () => {
    setIsSignInOpen(false)
    setError('')
    setIsSubmitting(false)
    play('click')
  }

  const closeSignUp = () => {
    setIsSignUpOpen(false)
    setError('')
    setIsSubmitting(false)
    play('click')
  }

  // Switch functions - these switch between modals
  const switchToSignUp = () => {
    setIsSignInOpen(false)
    setIsSignUpOpen(true)
    setError('')
    setIsSubmitting(false)
  }

  const switchToSignIn = () => {
    setIsSignUpOpen(false)
    setIsSignInOpen(true)
    setError('')
    setIsSubmitting(false)
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex items-center space-x-4">
        {/* Placeholder buttons that match server-rendered size */}
        <div className="w-16 h-8 bg-transparent"></div>
        <div className="w-16 h-8 bg-transparent"></div>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => {
          play('click')
          setIsSignInOpen(true)
        }}
        className={buttonClassName || cn(
          "relative group flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-all duration-150",
          "text-gray-400 hover:text-white",
          "focus:outline-none"
        )}
        onMouseEnter={() => play('hover')}
      >
        <span className="absolute inset-0 transition-all duration-150 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-gray-700 to-gray-900 border-t-2 border-l border-r border-b-2 border-t-cyan-400 border-l-purple-500 border-r-pink-500 border-b-gray-800 rounded-md"></span>
        <span className="relative flex items-center gap-1.5">
          <svg className={`${iconClassName || "w-3.5 h-3.5 text-gray-400 group-hover:text-cyan-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          <span className={textClassName || "text-gray-400 group-hover:text-white"}>Sign In</span>
        </span>
      </button>

      <button
        onClick={() => {
          play('click')
          setIsSignUpOpen(true)
        }}
        className={buttonClassName || cn(
          "relative group flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-all duration-150",
          "text-gray-400 hover:text-white",
          "focus:outline-none"
        )}
        onMouseEnter={() => play('hover')}
      >
        <span className="absolute inset-0 transition-all duration-150 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-gray-700 to-gray-900 border-t-2 border-l border-r border-b-2 border-t-cyan-400 border-l-purple-500 border-r-pink-500 border-b-gray-800 rounded-md"></span>
        <span className="relative flex items-center gap-1.5">
          <svg className={`${iconClassName || "w-3.5 h-3.5 text-gray-400 group-hover:text-cyan-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span className={textClassName || "text-gray-400 group-hover:text-white"}>Sign Up</span>
        </span>
      </button>

      <AuthModal
        isOpen={isSignInOpen}
        onClose={closeSignIn}
        onSwitch={switchToSignUp}
        type="signin"
        onSubmit={(email, password) => handleSubmit(email, password, 'signin')}
        onOAuth={handleOAuth}
        isSubmitting={isSubmitting}
        error={error}
        playSound={play}
      />

      <AuthModal
        isOpen={isSignUpOpen}
        onClose={closeSignUp}
        onSwitch={switchToSignIn}
        type="signup"
        onSubmit={(email, password) => handleSubmit(email, password, 'signup')}
        onOAuth={handleOAuth}
        isSubmitting={isSubmitting}
        error={error}
        playSound={play}
      />
    </>
  )
}
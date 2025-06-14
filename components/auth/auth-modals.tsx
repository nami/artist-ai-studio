import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Github, Mail, LogIn, UserPlus, X } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useSound } from '@/contexts/sound-context'
import { cn } from '@/lib/utils'

// Reusable style classes
const styles = {
  modal: {
    overlay: "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center",
    container: "relative w-full max-w-md",
    content: "relative bg-black rounded-xl p-6",
    scanlines: "absolute inset-0 pointer-events-none overflow-hidden opacity-15",
  },
  border: {
    container: "relative bg-gradient-to-b from-gray-700 to-gray-900 rounded-xl p-[2px] group",
    neon: "absolute inset-0 rounded-xl overflow-hidden",
    base: "absolute inset-0 rounded-xl bg-gray-900/90",
    top: "absolute top-0 left-0 right-0 h-[4px] bg-cyan-400 shadow-[0_0_5px_#0ff,0_0_10px_#0ff] group-hover:shadow-[0_0_10px_#0ff,0_0_20px_#0ff]",
    left: "absolute top-0 left-0 bottom-0 w-[4px] bg-purple-500 shadow-[0_0_5px_#f0f,0_0_10px_#f0f] group-hover:shadow-[0_0_10px_#f0f,0_0_20px_#f0f]",
    right: "absolute top-0 right-0 bottom-0 w-[4px] bg-pink-500 shadow-[0_0_5px_#f0f,0_0_10px_#f0f] group-hover:shadow-[0_0_10px_#f0f,0_0_20px_#f0f]",
    bottom: "absolute bottom-0 left-0 right-0 h-[4px] bg-green-400 shadow-[0_0_5px_#0f0,0_0_10px_#0f0] group-hover:shadow-[0_0_10px_#0f0,0_0_20px_#0f0]",
  },
  input: "w-full px-4 py-2 bg-gray-900 border-2 border-gray-800 text-white font-mono text-sm focus:outline-none transition-colors rounded-lg focus:border-t-cyan-400 focus:border-l-purple-500 focus:border-r-pink-500 focus:border-b-green-400",
  button: {
    base: "relative w-full",
    gradient: "absolute inset-0 rounded-lg blur-sm opacity-70",
    content: "relative border-2 bg-gray-900/90 rounded-lg py-2 hover:border-t-cyan-400 hover:border-l-purple-500 hover:border-r-pink-500 hover:border-b-green-400 transition-all duration-200",
    text: "flex items-center justify-center gap-2 font-mono text-sm uppercase tracking-wider transition-colors",
  },
  closeButton: "absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-800 transition-colors",
}

// Animation variants
const modalVariants = {
  overlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  content: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
  },
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent, type: 'signin' | 'signup') => {
    e.preventDefault()
    setError('')
    play('click')

    try {
      if (type === 'signin') {
        await signIn(email, password)
        setIsSignInOpen(false)
      } else {
        await signUp(email, password)
        setIsSignUpOpen(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const Modal = ({ isOpen, onClose, type }: { isOpen: boolean; onClose: () => void; type: 'signin' | 'signup' }) => (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          {...modalVariants.overlay}
          className={styles.modal.overlay}
          onClick={onClose}
        >
          <motion.div
            {...modalVariants.content}
            className={styles.modal.container}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.modal.scanlines}>
              <div className="scanlines h-full w-full"></div>
            </div>

            <div className={styles.border.container}>
              <div className={styles.border.neon}>
                <div className={styles.border.base}>
                  <div className={styles.border.top} />
                  <div className={styles.border.left} />
                  <div className={styles.border.right} />
                  <div className={styles.border.bottom} />
                </div>
              </div>

              <div className={styles.modal.content}>
                <button
                  onClick={onClose}
                  className={styles.closeButton}
                  onMouseEnter={() => play('hover')}
                >
                  <X className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>

                <h2 className="text-xl font-mono font-bold mb-6 text-center text-white uppercase tracking-wider">
                  {type === 'signin' ? 'Sign In' : 'Sign Up'}
                </h2>

                <form onSubmit={e => handleSubmit(e, type)} className="space-y-4">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={styles.input}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={styles.input}
                    required
                  />
                  {error && <p className="text-red-500 text-sm font-mono">{error}</p>}
                  
                  <button
                    type="submit"
                    className={styles.button.base}
                    onMouseEnter={() => play('hover')}
                  >
                    <div className={`${styles.button.gradient} bg-gradient-to-br from-cyan-500 to-blue-600`} />
                    <div className={`${styles.button.content} border-cyan-500/50`}>
                      <span className={`${styles.button.text} text-cyan-400 hover:text-white`}>
                        {type === 'signin' ? 'Sign In' : 'Sign Up'}
                      </span>
                    </div>
                  </button>
                </form>

                <div className="mt-4 space-y-3">
                  <button
                    onClick={() => signInWithProvider('github')}
                    className={styles.button.base}
                    onMouseEnter={() => play('hover')}
                  >
                    <div className={`${styles.button.gradient} bg-gradient-to-br from-purple-500 to-indigo-600`} />
                    <div className={`${styles.button.content} border-purple-500/50`}>
                      <span className={`${styles.button.text} text-purple-400 hover:text-white`}>
                        <Github className="w-4 h-4" />
                        Continue with GitHub
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => signInWithProvider('google')}
                    className={styles.button.base}
                    onMouseEnter={() => play('hover')}
                  >
                    <div className={`${styles.button.gradient} bg-gradient-to-br from-pink-500 to-purple-600`} />
                    <div className={`${styles.button.content} border-pink-500/50`}>
                      <span className={`${styles.button.text} text-pink-400 hover:text-white`}>
                        <Mail className="w-4 h-4" />
                        Continue with Google
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <button
        onClick={() => setIsSignInOpen(true)}
        className={buttonClassName || cn(
          "relative group flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-all duration-150",
          "text-gray-400 hover:text-white",
          "focus:outline-none"
        )}
        onMouseEnter={() => play('hover')}
      >
        <span className="absolute inset-0 transition-all duration-150 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-gray-700 to-gray-900 border-t-2 border-l border-r border-b-2 border-t-cyan-400 border-l-purple-500 border-r-pink-500 border-b-gray-800 rounded-md"></span>
        <span className="relative flex items-center gap-1.5">
          <LogIn className={iconClassName || "w-3.5 h-3.5 text-gray-400 group-hover:text-cyan-400"} />
          <span className={textClassName || "text-gray-400 group-hover:text-white"}>{'Sign In'}</span>
        </span>
      </button>

      <button
        onClick={() => setIsSignUpOpen(true)}
        className={buttonClassName || cn(
          "relative group flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-all duration-150",
          "text-gray-400 hover:text-white",
          "focus:outline-none"
        )}
        onMouseEnter={() => play('hover')}
      >
        <span className="absolute inset-0 transition-all duration-150 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-gray-700 to-gray-900 border-t-2 border-l border-r border-b-2 border-t-cyan-400 border-l-purple-500 border-r-pink-500 border-b-gray-800 rounded-md"></span>
        <span className="relative flex items-center gap-1.5">
          <UserPlus className={iconClassName || "w-3.5 h-3.5 text-gray-400 group-hover:text-cyan-400"} />
          <span className={textClassName || "text-gray-400 group-hover:text-white"}>{'Sign Up'}</span>
        </span>
      </button>

      <Modal isOpen={isSignInOpen} onClose={() => setIsSignInOpen(false)} type="signin" />
      <Modal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} type="signup" />
    </>
  )
} 
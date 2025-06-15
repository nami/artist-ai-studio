import { createClient } from '@supabase/supabase-js';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Create a safe storage adapter that works in SSR
const createBrowserStorage = () => {
  // Check if we're in the browser
  if (typeof window === 'undefined') {
    // Return a no-op storage for server-side rendering
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }

  // Return actual localStorage for client-side
  return {
    getItem: (key: string) => {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn('localStorage.getItem failed:', error);
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn('localStorage.setItem failed:', error);
      }
    },
    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('localStorage.removeItem failed:', error);
      }
    },
  };
};

// Create Supabase client with SSR-safe configuration
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: createBrowserStorage(),
    },
  }
);

// Flag to check if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
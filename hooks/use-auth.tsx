"use client";

import { useEffect, useState } from "react";
import { User, AuthChangeEvent, Session, AuthError } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      console.warn('Supabase is not properly configured. Auth features will be disabled.');
      setError('Authentication service is not configured');
      setLoading(false);
      return;
    }

    // Get initial session with proper error handling
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          // Handle refresh token errors gracefully
          if (error.message.includes('refresh_token_not_found') || 
              error.message.includes('Invalid Refresh Token') ||
              error.message.includes('Refresh Token Not Found')) {
            console.log('Refresh token expired or invalid, clearing session');
            // Clear any stale session data
            await supabase.auth.signOut();
            setUser(null);
            setError(null);
          } else {
            console.error('Auth session error:', error);
            setError(error.message);
          }
        } else {
          setUser(session?.user ?? null);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to get initial session:', err);
        // Don't set this as an error state, just clear the user
        setUser(null);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes with error handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
          setUser(session?.user ?? null);
          setError(null);
          break;
        case 'SIGNED_OUT':
          setUser(null);
          setError(null);
          break;
        case 'TOKEN_REFRESHED':
          setUser(session?.user ?? null);
          setError(null);
          break;
        case 'USER_UPDATED':
          setUser(session?.user ?? null);
          break;
        default:
          setUser(session?.user ?? null);
          setError(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Authentication service is not configured');
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Authentication service is not configured');
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Authentication service is not configured');
    }

    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        // Even if there's an error, clear local state
      }
      
      // Always clear local state
      setUser(null);
      setError(null);
      
      // Force hard redirect to clear all state
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if there's an error, clear local state and redirect
      setUser(null);
      setError(null);
      window.location.href = '/';
    }
  };

  const signInWithProvider = async (provider: 'github' | 'google') => {
    if (!isSupabaseConfigured) {
      throw new Error('Authentication service is not configured');
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error(`${provider} OAuth error:`, error);
      throw error;
    }
  };

  // Helper function to clear stale auth data
  const clearAuthData = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setError(null);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  return {
    user,
    loading,
    error,
    isConfigured: isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    signInWithProvider,
    clearAuthData, // Export this in case you need to manually clear data
  };
}
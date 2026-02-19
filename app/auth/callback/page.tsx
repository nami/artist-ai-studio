"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasExchanged = useRef(false);

  useEffect(() => {
    // Prevent double-execution in React Strict Mode (dev) and re-renders
    if (hasExchanged.current) return;
    hasExchanged.current = true;

    const code = searchParams.get("code");

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error("Auth callback error:", error);
          router.push("/");
        } else {
          router.push("/dashboard");
        }
      });
    } else {
      // No code — let the auth listener handle session from URL hash
      router.push("/");
    }
  }, [searchParams, router]);

  return null;
}

const Spinner = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-cyan-400 font-mono text-sm uppercase tracking-widest animate-pulse">
        Signing you in...
      </p>
    </div>
  </div>
);

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AuthCallbackInner />
      <Spinner />
    </Suspense>
  );
}

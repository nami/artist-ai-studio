"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
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
      // No code — might be implicit flow fallback, let the auth listener handle it
      router.push("/");
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-cyan-400 font-mono text-sm uppercase tracking-widest animate-pulse">
          Signing you in...
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const next = searchParams.get("next") ?? "/";
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("OAuth callback failed:", error.message);
          router.replace("/login?error=oauth_callback_failed");
          return;
        }
        router.replace(next);
        return;
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error("OAuth token callback failed:", error.message);
          router.replace("/login?error=oauth_token_callback_failed");
          return;
        }
        router.replace(next);
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session) {
        router.replace(next);
        return;
      }

      router.replace("/login?error=missing_oauth_code");
    };

    handleCallback();
  }, [router, searchParams]);

  return <div className="p-6">ログイン処理中...</div>;
}

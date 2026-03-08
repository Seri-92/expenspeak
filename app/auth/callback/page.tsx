"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const next = searchParams.get("next") ?? "/";
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      const provisionUser = async () => {
        const { error } = await supabase.rpc("provision_current_user");
        if (error) {
          console.error("User provisioning failed:", error.message);
          router.replace("/login?error=user_provision_failed");
          return false;
        }

        return true;
      };

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("OAuth callback failed:", error.message);
          router.replace("/login?error=oauth_callback_failed");
          return;
        }
        if (await provisionUser()) {
          router.replace(next);
        }
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
        if (await provisionUser()) {
          router.replace(next);
        }
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session) {
        if (await provisionUser()) {
          router.replace(next);
        }
        return;
      }

      router.replace("/login?error=missing_oauth_code");
    };

    void handleCallback();
  }, [router, searchParams]);

  return <div className="p-6">ログイン処理中...</div>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="p-6">ログイン処理中...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}

"use client";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

export async function handleLogin() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://iaxrksqugrmkhmpqhxsu.supabase.co/auth/v1/callback",
    }
  })
}

export default function Page() {
  return (
    <div className="p-6">
    <Button onClick={handleLogin}>Googleでログイン</Button>
    </div>
  );
}
import { supabase } from "@/lib/supabaseClient";

export async function handleLogin() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://iaxrksqugrmkhmpqhxsu.supabase.co/auth/v1/callback",
    },
  });

  if (error) {
    console.error("Login failed:", error.message);
  } else {
    console.log("Login successful:", data);
  }
}
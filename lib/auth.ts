import { supabase } from "@/lib/supabaseClient";

export async function handleLogin() {
  const redirectTo = `${window.location.origin}/auth/callback`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error) {
    console.error("Login failed:", error.message);
  } else {
    console.log("Login successful:", data);
  }
}

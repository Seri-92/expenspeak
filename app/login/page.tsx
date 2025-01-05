"use client";
import { Button } from "@/components/ui/button";
import { handleLogin } from "@/lib/auth";

export default function Page() {
  return (
    <div className="p-6">
    <Button onClick={handleLogin}>Googleでログイン</Button>
    </div>
  );
}
"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Only rendered when NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true (configured in Supabase). */
export function GoogleButton({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        className="btn btn-outline w-full"
        onClick={async () => {
          const { error } = await createClient().auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
          });
          if (error) setError("Google sign-in is not available right now. Please use email and password.");
        }}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.4-.2-2.1H12v4h6c-.1 1-.8 2.5-2.3 3.5l3.6 2.8c2.1-2 3.3-4.9 3.3-8.2z" />
          <path fill="#34A853" d="M12 23c3 0 5.6-1 7.4-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6l-3.7 2.9C3.8 20.5 7.6 23 12 23z" />
          <path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.4-.4-2s.1-1.4.4-2L2 7.1C1.4 8.6 1 10.2 1 12s.4 3.4 1 4.9L5.7 14z" />
          <path fill="#EA4335" d="M12 5.4c1.7 0 3.1.7 3.9 1.5l2.9-2.9C17.6 2.5 15 1 12 1 7.6 1 3.8 3.5 2 7.1L5.7 10c.9-2.6 3.4-4.6 6.3-4.6z" />
        </svg>
        Continue with Google
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C17.1 3.2 14.8 2.2 12 2.2 6.9 2.2 2.8 6.3 2.8 11.4S6.9 20.6 12 20.6c5.9 0 9.8-4.1 9.8-9.9 0-.7-.1-1.2-.2-1.7H12z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setError("Falta configurar Supabase (.env.local). Revisa .env.local.example.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="card w-full max-w-sm rounded-2xl p-7 text-center">
      <h1 className="font-display text-[22px] font-semibold tracking-tight text-ink-hi">
        Entra a Atlas
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-mid">
        Tu perfil, tus vacantes adaptadas y tus mensajes — guardados y sincronizados.
      </p>

      <button
        onClick={signIn}
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full bg-brass px-4 py-2.5 text-[14px] font-semibold text-[#1a1305] transition-colors hover:bg-brass-soft disabled:opacity-60"
      >
        <GoogleMark />
        {loading ? "Redirigiendo…" : "Continuar con Google"}
      </button>

      {error && <p className="mt-3 text-[12px] text-caution">{error}</p>}

      <p className="mt-5 text-[11px] leading-relaxed text-ink-lo">
        Al continuar aceptas que guardemos la información de tu perfil para generar tus CVs
        adaptados.
      </p>
    </div>
  );
}

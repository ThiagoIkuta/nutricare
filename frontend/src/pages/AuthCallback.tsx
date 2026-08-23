import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/useAuth";
import type { AuthSession } from "../auth/types";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Exchange the OAuth code in the URL for a session.
        // The exact helper method name and return shape can vary between
        // versions of the Supabase client; call it dynamically to avoid
        // hard TypeScript coupling.
        const getSessionFromUrl = (
          supabase.auth as unknown as {
            getSessionFromUrl?: () => Promise<unknown>;
          }
        )?.getSessionFromUrl;
        const res = getSessionFromUrl ? await getSessionFromUrl() : null;

        type SessionResponse = {
          data?: { session?: unknown };
          session?: unknown;
          error?: { message?: string } | null;
        };

        const resTyped = res as SessionResponse | null;
        const session = resTyped?.data?.session ?? resTyped?.session ?? null;
        const err = resTyped?.error ?? null;

        if (err || !session) {
          setError(
            err?.message || "Falha ao processar callback de autenticação.",
          );
          // fallback: go back to login after a short delay
          setTimeout(() => navigate("/login"), 2000);
          return;
        }

        // Define a narrow session-like type to avoid using `any` everywhere
        type SupabaseSessionLike = {
          access_token: string;
          refresh_token: string;
          user: {
            id: string;
            email?: string | null;
            phone?: string | null;
            app_metadata?: Record<string, unknown>;
            user_metadata?: Record<string, unknown>;
          };
        };

        const s = session as SupabaseSessionLike;

        // Map Supabase session -> app AuthSession
        const authSession: AuthSession = {
          access_token: s.access_token,
          refresh_token: s.refresh_token,
          token_type: "bearer",
          user: {
            id: s.user?.id,
            email: s.user?.email ?? null,
            phone: s.user?.phone ?? null,
            app_metadata: s.user?.app_metadata ?? {},
            user_metadata: s.user?.user_metadata ?? {},
          },
        };

        // Clear sensitive parts of the URL
        try {
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        } catch {
          // ignore
        }

        // Persist session (we choose local storage for social login)
        setSession(authSession, "local");
        navigate("/app");
      } catch (exc) {
        console.error("Auth callback failed", exc);
        setError("Erro interno ao processar autenticação.");
        setTimeout(() => navigate("/login"), 2000);
      }
    })();
  }, [navigate, setSession]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">
            {error}
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            Processando autenticação...
          </div>
        )}
      </div>
    </main>
  );
}

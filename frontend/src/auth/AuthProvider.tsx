import {
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { setApiAccessToken } from "../lib/api";
import { clearStoredSession, loadStoredSession, storeSession } from "./storage";
import { AuthContext, type AuthContextValue } from "./context";
import type { AuthSession } from "./types";

export function AuthProvider({ children }: { children: ReactNode }) {
  // O token precisa estar anexado ao axios ANTES de qualquer efeito filho
  // rodar (ex: o fetch de dado inicial de uma página) — por isso é setado
  // aqui, síncrono durante o cálculo do estado inicial, e não num useEffect
  // (efeitos de componentes filhos disparam antes dos do pai, então um
  // useEffect aqui deixava a primeira request sair sem Authorization numa
  // carga completa de página).
  const [session, setSessionState] = useState<AuthSession | null>(() => {
    const stored = loadStoredSession();
    setApiAccessToken(stored?.access_token ?? null);
    return stored;
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      isHydrated: true,
      session,
      setSession(nextSession, persistence) {
        storeSession(nextSession, persistence);
        setApiAccessToken(nextSession.access_token);
        setSessionState(nextSession);
      },
      clearSession() {
        clearStoredSession();
        setApiAccessToken(null);
        setSessionState(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

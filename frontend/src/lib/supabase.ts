import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

// Verifica se as variáveis existem, mas NÃO lança erro
const isConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isConfigured) {
  console.warn(
    "⚠️ Supabase não configurado. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY",
  );
}

// Cria o cliente ou fallback sem quebrar a aplicação
const supabaseClient = isConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  : {
      auth: {
        signInWithOAuth: async () => ({
          data: { url: null },
          error: { message: "Supabase não configurado" },
        }),
        getSessionFromUrl: async () => ({
          data: { session: null },
          error: { message: "Supabase não configurado" },
        }),
        signInWithPassword: async () => ({
          data: { session: null, user: null },
          error: { message: "Supabase não configurado" },
        }),
        signUp: async () => ({
          data: { session: null, user: null },
          error: { message: "Supabase não configurado" },
        }),
      },
    };

export const supabase = supabaseClient;

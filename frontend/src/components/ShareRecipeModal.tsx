import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, MessageSquare, X } from "lucide-react";

import { api, getApiErrorMessage } from "../lib/api";
import { useAuth } from "../auth/useAuth";

type ChatLink = {
  id: number;
  nutritionist_id: string;
  other_username: string | null;
};

type Props = {
  recipeId: number;
  recipeTitle: string;
  onClose: () => void;
};

/** Escolhe uma conversa ativa e envia a receita como box no chat. */
export default function ShareRecipeModal({ recipeId, recipeTitle, onClose }: Props) {
  const { session } = useAuth();
  const myId = session?.user.id;

  const [links, setLinks] = useState<ChatLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState<number | null>(null);
  const [sentTo, setSentTo] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ChatLink[]>("/messages/links")
      .then((res) => setLinks(res.data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  async function handleSend(linkId: number) {
    setSendingTo(linkId);
    setError(null);
    try {
      await api.post(`/messages/${linkId}/recipe`, { recipe_id: recipeId });
      setSentTo((prev) => [...prev, linkId]);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSendingTo(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900">Compartilhar no chat</h2>
            <p className="truncate text-xs text-gray-400">{recipeTitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-2">
          {loading && <p className="text-xs text-gray-400">Carregando conversas...</p>}
          {!loading && links.length === 0 && (
            <div className="py-4 text-center">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 text-gray-200" />
              <p className="text-xs text-gray-400">Você ainda não tem conversas ativas.</p>
            </div>
          )}
          {links.map((link) => {
            const sent = sentTo.includes(link.id);
            return (
              <div key={link.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{link.other_username ?? "Usuário"}</p>
                  <p className="text-xs text-gray-400">{link.nutritionist_id === myId ? "Paciente" : "Nutricionista"}</p>
                </div>
                {sent ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-green-600">
                    <CheckCircle2 className="h-4 w-4" /> Enviada
                  </span>
                ) : (
                  <button
                    onClick={() => handleSend(link.id)}
                    disabled={sendingTo !== null}
                    className="shrink-0 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-60 transition"
                  >
                    {sendingTo === link.id ? "Enviando..." : "Enviar"}
                  </button>
                )}
              </div>
            );
          })}
          {error && <p className="text-xs text-red-500">{error}</p>}
          {sentTo.length > 0 && (
            <Link to="/app/mensagens" className="block pt-1 text-center text-xs font-medium text-orange-500 hover:text-orange-600">
              Ir para as mensagens →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

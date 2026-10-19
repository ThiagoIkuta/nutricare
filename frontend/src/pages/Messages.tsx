import { useEffect, useRef, useState } from "react";
import { ChefHat, Image as ImageIcon, Send, MessageSquare } from "lucide-react";

import { api, getApiErrorMessage } from "../lib/api";
import { useAuth } from "../auth/useAuth";
import BackLink from "../components/BackLink";
import RecipeChatBox from "../components/RecipeChatBox";
import RecipeModal from "../components/RecipeModal";
import RecipePickerModal from "../components/RecipePickerModal";
import type { Recipe, RecipeContent } from "../recipes/types";

type ChatLink = {
  id: number;
  nutritionist_id: string;
  patient_id: string;
  status: string;
  other_username: string | null;
  other_id: string;
};

type Message = {
  id: number;
  care_link_id: number;
  sender_id: string;
  message_type: string;
  content: string | null;
  attachment_url: string | null;
  recipe_id: number | null;
  recipe_snapshot: RecipeContent | null;
  accepted_recipe_id: number | null;
  sent_at: string;
  read_at: string | null;
  is_deleted: boolean;
  sender_username: string | null;
};

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  if (isToday) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const POLL_INTERVAL = 5000;

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showBrowserNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
    new Notification(title, { body, icon: "/favicon.ico" });
  }
}

export default function Messages() {
  const { session } = useAuth();
  const myId = session?.user.id;

  const [links, setLinks] = useState<ChatLink[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgCount = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pickingRecipe, setPickingRecipe] = useState(false);
  const [sharingRecipe, setSharingRecipe] = useState(false);
  const [viewingRecipe, setViewingRecipe] = useState<RecipeContent | null>(null);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  // Request browser notification permission on page load
  useEffect(() => { requestNotificationPermission(); }, []);

  // Load chat sidebar
  useEffect(() => {
    api
      .get<ChatLink[]>("/messages/links")
      .then((res) => {
        setLinks(res.data);
        if (res.data.length === 1) setSelectedId(res.data[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingLinks(false));
  }, []);

  // Load + poll messages for selected conversation
  useEffect(() => {
    if (!selectedId) return;

    function fetch() {
      setLoadingMsgs(true);
      api
        .get<Message[]>(`/messages/${selectedId}`)
        .then((res) => {
          const newMsgs = res.data;
          // Detect new messages from others and show notification
          if (newMsgs.length > lastMsgCount.current && lastMsgCount.current > 0) {
            const fresh = newMsgs.slice(lastMsgCount.current);
            fresh.forEach((m) => {
              if (m.sender_id !== myId) {
                const sender = m.sender_username ?? "Nova mensagem";
                const preview =
                  m.content ?? (m.message_type === "recipe" ? "Compartilhou uma receita" : "Enviou uma imagem");
                showBrowserNotification(sender, preview);
              }
            });
          }
          lastMsgCount.current = newMsgs.length;
          setMessages(newMsgs);
          // Mark as read silently
          api.post(`/messages/${selectedId}/read`).catch(() => {});
        })
        .catch(() => {})
        .finally(() => setLoadingMsgs(false));
    }

    fetch();
    pollRef.current = setInterval(fetch, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !selectedId) return;

    setSending(true);
    setError(null);
    const content = text.trim();
    setText("");

    try {
      const res = await api.post<Message>(`/messages/${selectedId}`, { content });
      setMessages((prev) => [...prev, res.data]);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setText(content);
    } finally {
      setSending(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedId) return;

    setError(null);

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Apenas imagens (JPEG, PNG, WEBP ou GIF) são permitidas.");
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError("A imagem excede o limite de 5MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    const uploadCareLinkId = selectedId;

    setUploadingImage(true);
    try {
      // `api`'s default Content-Type is application/json, which makes axios
      // JSON-serialize (and destroy) a FormData body unless we clear it here
      // — verified empirically, since a plain omission still inherits the
      // instance default. Clearing it lets the browser set the multipart
      // Content-Type itself, boundary included.
      const res = await api.post<Message>(
        `/messages/${uploadCareLinkId}/attachment`,
        formData,
        { headers: { "Content-Type": undefined as unknown as string } },
      );
      // The user may have switched conversations while this was uploading;
      // only splice the result into the thread that's still on screen.
      if (uploadCareLinkId === selectedId) {
        setMessages((prev) => [...prev, res.data]);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleShareRecipe(recipe: Recipe) {
    if (!selectedId) return;
    setPickingRecipe(false);
    setSharingRecipe(true);
    setError(null);
    const shareCareLinkId = selectedId;
    try {
      const res = await api.post<Message>(`/messages/${shareCareLinkId}/recipe`, { recipe_id: recipe.id });
      if (shareCareLinkId === selectedId) {
        setMessages((prev) => [...prev, res.data]);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSharingRecipe(false);
    }
  }

  async function handleAcceptRecipe(msg: Message) {
    setAcceptingId(msg.id);
    setError(null);
    try {
      const res = await api.post<Recipe>(`/messages/${msg.care_link_id}/${msg.id}/accept-recipe`);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, accepted_recipe_id: res.data.id } : m)),
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAcceptingId(null);
    }
  }

  const selectedLink = links.find((l) => l.id === selectedId);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center">
          <div>
            <BackLink to="/app" label="Dashboard" />
            <h1 className="mt-0.5 text-xl font-bold text-gray-900">Mensagens</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="flex gap-4 h-[calc(100vh-180px)]">

          {/* Sidebar */}
          <aside className="w-60 shrink-0 flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1 mb-1">
              Conversas
            </p>

            {loadingLinks && (
              <p className="text-xs text-gray-400 px-1">Carregando...</p>
            )}

            {!loadingLinks && links.length === 0 && (
              <div className="rounded-2xl bg-white shadow-sm p-4 text-center">
                <MessageSquare className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Nenhuma conversa ativa.</p>
              </div>
            )}

            {links.map((link) => (
              <button
                key={link.id}
                onClick={() => setSelectedId(link.id)}
                className={`w-full text-left rounded-2xl px-4 py-3 transition ${
                  selectedId === link.id
                    ? "bg-orange-500 text-white shadow"
                    : "bg-white shadow-sm hover:border-orange-200 border border-gray-100"
                }`}
              >
                <p
                  className={`text-sm font-semibold truncate ${
                    selectedId === link.id ? "text-white" : "text-gray-800"
                  }`}
                >
                  {link.other_username ?? "Usuário"}
                </p>
                <p
                  className={`text-xs mt-0.5 ${
                    selectedId === link.id ? "text-orange-100" : "text-gray-400"
                  }`}
                >
                  {link.nutritionist_id === myId ? "Paciente" : "Nutricionista"}
                </p>
              </button>
            ))}
          </aside>

          {/* Chat area */}
          <div className="flex-1 flex flex-col rounded-2xl bg-white shadow-sm overflow-hidden">
            {!selectedId ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-gray-100 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">
                    Selecione uma conversa ao lado
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-500">
                    {(selectedLink?.other_username ?? "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {selectedLink?.other_username ?? "Usuário"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {selectedLink?.nutritionist_id === myId ? "Paciente" : "Nutricionista"}
                    </p>
                  </div>
                </div>

                {/* Messages list */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {loadingMsgs && messages.length === 0 && (
                    <p className="text-center text-xs text-gray-400">Carregando mensagens...</p>
                  )}

                  {messages.length === 0 && !loadingMsgs && (
                    <p className="text-center text-xs text-gray-400 mt-8">
                      Nenhuma mensagem ainda. Diga olá!
                    </p>
                  )}

                  {messages.map((msg) => {
                    const isMe = msg.sender_id === myId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                            isMe
                              ? "bg-orange-500 text-white rounded-br-sm"
                              : "bg-gray-100 text-gray-800 rounded-bl-sm"
                          }`}
                        >
                          {!isMe && (
                            <p className="text-xs font-semibold text-orange-400 mb-0.5">
                              {msg.sender_username}
                            </p>
                          )}
                          {msg.attachment_url && (
                            <a href={msg.attachment_url} target="_blank" rel="noreferrer">
                              <img
                                src={msg.attachment_url}
                                alt="Imagem enviada no chat"
                                className="max-w-full max-h-64 rounded-lg mb-1 object-cover"
                              />
                            </a>
                          )}
                          {msg.message_type === "recipe" && msg.recipe_snapshot && (
                            <RecipeChatBox
                              recipe={msg.recipe_snapshot}
                              isMine={isMe}
                              acceptedRecipeId={msg.accepted_recipe_id}
                              accepting={acceptingId === msg.id}
                              onView={() => setViewingRecipe(msg.recipe_snapshot)}
                              onAccept={() => handleAcceptRecipe(msg)}
                            />
                          )}
                          {msg.content && (
                            <p className="text-sm leading-snug whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          )}
                          <p
                            className={`text-right text-[10px] mt-1 ${
                              isMe ? "text-orange-200" : "text-gray-400"
                            }`}
                          >
                            {formatTime(msg.sent_at)}
                            {isMe && msg.read_at && " · Lida"}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="border-t border-gray-100 px-4 py-3">
                  {error && (
                    <p className="text-xs text-red-500 mb-2">{error}</p>
                  )}
                  <form onSubmit={handleSend} className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      title="Enviar imagem"
                      className="flex items-center justify-center h-10 w-10 rounded-xl border border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-500 disabled:opacity-50 transition shrink-0"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickingRecipe(true)}
                      disabled={sharingRecipe}
                      title="Compartilhar receita"
                      className="flex items-center justify-center h-10 w-10 rounded-xl border border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-500 disabled:opacity-50 transition shrink-0"
                    >
                      <ChefHat className="h-4 w-4" />
                    </button>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      disabled={sending}
                      className="flex-1 h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition"
                    />
                    <button
                      type="submit"
                      disabled={!text.trim() || sending}
                      className="flex items-center justify-center h-10 w-10 rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {pickingRecipe && (
        <RecipePickerModal onPick={handleShareRecipe} onClose={() => setPickingRecipe(false)} />
      )}
      {viewingRecipe && (
        <RecipeModal title="Receita compartilhada" recipes={[viewingRecipe]} onClose={() => setViewingRecipe(null)} />
      )}
    </main>
  );
}

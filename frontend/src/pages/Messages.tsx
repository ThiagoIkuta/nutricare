import { useEffect, useRef, useState } from "react";
import { Send, MessageSquare } from "lucide-react";

import { api, getApiErrorMessage } from "../lib/api";
import { useAuth } from "../auth/useAuth";
import BackLink from "../components/BackLink";

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
  content: string;
  sent_at: string;
  read_at: string | null;
  is_deleted: boolean;
  sender_username: string | null;
};

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
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgCount = useRef(0);

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
                showBrowserNotification(sender, m.content);
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
                          <p className="text-sm leading-snug whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
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
    </main>
  );
}

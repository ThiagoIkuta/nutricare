import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Users, X } from "lucide-react";

import { api, getApiErrorMessage } from "../lib/api";
import BackLink from "../components/BackLink";
import type { CareLink } from "../diet/types";

type PatientOption = { id: string; username: string | null };

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  pending: "Pendente",
  ended: "Encerrado",
  cancelled: "Cancelado",
  rejected: "Rejeitado",
};

const STATUS_CLASS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  ended: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-100 text-red-500",
  rejected: "bg-red-100 text-red-500",
};

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function Patients() {
  const [links, setLinks] = useState<CareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [allPatients, setAllPatients] = useState<PatientOption[]>([]);
  const [addMode, setAddMode] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [sendInvitation, setSendInvitation] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<CareLink[]>("/care/links")
      .then((res) => setLinks(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function openAddMode() {
    setAddMode(true);
    setError(null);
    api
      .get<PatientOption[]>("/care/patients")
      .then((res) => setAllPatients(res.data))
      .catch(() => setAllPatients([]));
  }

  async function handleAddLink() {
    if (!selectedPatientId) return;
    setAddLoading(true);
    setError(null);
    try {
      const res = await api.post<CareLink>("/care/links", {
        patient_id: selectedPatientId,
        send_invitation: sendInvitation,
      });
      setLinks((prev) => [res.data, ...prev]);
      setAddMode(false);
      setSelectedPatientId("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAddLoading(false);
    }
  }

  const activeLinks = links.filter((l) => l.status === "active");
  const otherLinks = links.filter((l) => l.status !== "active");

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div>
            <BackLink to="/app" label="Dashboard" />
            <h1 className="mt-0.5 text-xl font-bold text-gray-900">Meus Pacientes</h1>
          </div>
          {!addMode && (
            <button
              onClick={openAddMode}
              className="flex items-center gap-1.5 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-green-600 transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Vincular paciente
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-5">

        {/* Add mode panel */}
        {addMode && (
          <div className="rounded-2xl bg-white shadow-sm border border-orange-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Vincular novo paciente</h2>
              <button
                onClick={() => { setAddMode(false); setError(null); setSelectedPatientId(""); }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Selecione um paciente cadastrado no sistema para vincular ao seu consultório.
              O vínculo é ativado imediatamente.
            </p>

            {allPatients.length === 0 ? (
              <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-400 text-center">
                Nenhum paciente cadastrado no sistema ainda.
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="flex-1 h-10 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="">Selecione um paciente...</option>
                    {allPatients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.username ?? `ID: ${p.id.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddLink}
                    disabled={!selectedPatientId || addLoading}
                    className="rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-green-600 disabled:opacity-60 transition"
                  >
                    {addLoading ? "Vinculando..." : "Confirmar"}
                  </button>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendInvitation}
                    onChange={(e) => setSendInvitation(e.target.checked)}
                    className="h-4 w-4 accent-orange-500"
                  />
                  Enviar como convite (paciente precisa aceitar)
                </label>
              </>
            )}

            {error && (
              <p className="text-sm text-red-600 rounded-xl bg-red-50 px-4 py-2">{error}</p>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl bg-white p-8 shadow-sm text-center text-sm text-gray-400">
            Carregando pacientes...
          </div>
        )}

        {/* Active links */}
        {!loading && (
          <>
            {activeLinks.length > 0 && (
              <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Pacientes ativos ({activeLinks.length})
                </h2>
                <div className="space-y-3">
                  {activeLinks.map((link) => (
                    <PatientCard key={link.id} link={link} />
                  ))}
                </div>
              </div>
            )}

            {activeLinks.length === 0 && !addMode && (
              <div className="rounded-2xl bg-white p-12 shadow-sm flex flex-col items-center gap-4 text-center">
                <Users className="h-10 w-10 text-gray-200" />
                <div>
                  <p className="text-sm font-semibold text-gray-600">Nenhum paciente vinculado</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Vincule seus pacientes para criar planos alimentares para eles.
                  </p>
                </div>
                <button
                  onClick={openAddMode}
                  className="flex items-center gap-1.5 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-green-600 transition"
                >
                  <Plus className="h-4 w-4" />
                  Vincular primeiro paciente
                </button>
              </div>
            )}

            {/* Other links */}
            {otherLinks.length > 0 && (
              <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Outros vínculos
                </h2>
                <div className="space-y-2">
                  {otherLinks.map((link) => (
                    <PatientCard key={link.id} link={link} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function PatientCard({ link }: { link: CareLink }) {
  const name = link.patient_username ?? `Paciente`;
  const statusLabel = STATUS_LABEL[link.status] ?? link.status;
  const statusClass = STATUS_CLASS[link.status] ?? STATUS_CLASS.ended;

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 hover:border-orange-200 transition p-5 flex items-center gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
        {getInitials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">{name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Vinculado em{" "}
          {new Date(link.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}>
          {statusLabel}
        </span>
        {link.status === "active" && (
          <Link
            to={`/app/dietas/nova`}
            className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-green-400 hover:text-green-900 transition"
          >
            Novo plano
          </Link>
        )}
      </div>
    </div>
  );
}

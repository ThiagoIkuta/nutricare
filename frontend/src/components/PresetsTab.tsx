import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, Globe, Lock, Pencil, Plus, Trash2, Users, Utensils } from "lucide-react";

import { api, getApiErrorMessage } from "../lib/api";
import { useAuth } from "../auth/useAuth";
import type { CareLink, DietPlan, DietPlanPreset } from "../diet/types";

export default function PresetsTab() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const myId = session?.user.id;

  const [presets, setPresets] = useState<DietPlanPreset[]>([]);
  const [careLinks, setCareLinks] = useState<CareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [assignCareLinkId, setAssignCareLinkId] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      api.get<DietPlanPreset[]>("/diet/presets"),
      api.get<CareLink[]>("/care/links"),
    ])
      .then(([presetsRes, linksRes]) => {
        setPresets(presetsRes.data);
        setCareLinks(linksRes.data.filter((l) => l.status === "active"));
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDuplicate(presetId: number) {
    setBusyIds((prev) => new Set(prev).add(presetId));
    setError(null);
    try {
      const res = await api.post<DietPlanPreset>(`/diet/presets/${presetId}/duplicate`);
      setPresets((prev) => [...prev, res.data]);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(presetId);
        return next;
      });
    }
  }

  async function handleDelete(presetId: number) {
    setBusyIds((prev) => new Set(prev).add(presetId));
    setError(null);
    try {
      await api.delete(`/diet/presets/${presetId}`);
      setPresets((prev) => prev.filter((p) => p.id !== presetId));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(presetId);
        return next;
      });
    }
  }

  function openAssign(presetId: number) {
    setAssigningId(presetId);
    setAssignCareLinkId(careLinks.length === 1 ? String(careLinks[0].id) : "");
    setAssignError(null);
    setAssignSubmitting(false);
  }

  async function handleAssign() {
    const targetId = assigningId;
    if (!targetId || !assignCareLinkId) return;
    setAssignSubmitting(true);
    setAssignError(null);
    try {
      const res = await api.post<DietPlan>(`/diet/presets/${targetId}/assign`, {
        care_link_id: Number(assignCareLinkId),
      });
      if (assigningId !== targetId) return; // user moved to a different preset's modal meanwhile
      navigate(`/app/dietas/${res.data.id}`);
    } catch (err) {
      if (assigningId !== targetId) return;
      setAssignError(getApiErrorMessage(err));
    } finally {
      if (assigningId === targetId) setAssignSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-10 shadow-sm text-center text-sm text-gray-400">
        Carregando presets...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-red-600 rounded-xl bg-red-50 px-4 py-3">{error}</p>}

      <div className="flex justify-end">
        <Link
          to="/app/dietas/presets/novo"
          className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Novo preset
        </Link>
      </div>

      {presets.length === 0 && (
        <div className="rounded-2xl bg-white p-12 shadow-sm text-center text-sm text-gray-400">
          Nenhum preset disponível.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {presets.map((preset) => {
          const isMine = preset.nutritionist_id === myId;
          const canEdit = isMine && !preset.is_builtin;
          const mealCount = preset.meals.length;

          return (
            <div
              key={preset.id}
              className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 flex flex-col gap-3"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-gray-900">{preset.title}</h3>
                  {preset.is_builtin && (
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                      Padrão
                    </span>
                  )}
                  {!preset.is_builtin && (
                    <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
                      {preset.visibility === "public" ? (
                        <Globe className="h-3 w-3" />
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                      {preset.visibility === "public" ? "Público" : "Privado"}
                    </span>
                  )}
                </div>
                {preset.objective && (
                  <p className="text-sm text-gray-500 line-clamp-2">{preset.objective}</p>
                )}
                <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                  <Utensils className="h-3 w-3" />
                  {mealCount} {mealCount === 1 ? "refeição" : "refeições"}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-auto pt-2 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => openAssign(preset.id)}
                  disabled={careLinks.length === 0}
                  title={careLinks.length === 0 ? "Nenhum paciente vinculado" : "Atribuir a paciente"}
                  className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Users className="h-3.5 w-3.5" />
                  Atribuir
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicate(preset.id)}
                  disabled={busyIds.has(preset.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-orange-300 hover:text-orange-500 disabled:opacity-50 transition"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicar
                </button>
                {canEdit && (
                  <>
                    <Link
                      to={`/app/dietas/presets/${preset.id}/editar`}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-orange-300 hover:text-orange-500 transition"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(preset.id)}
                      disabled={busyIds.has(preset.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:border-red-300 hover:text-red-500 disabled:opacity-50 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {careLinks.length === 0 && presets.length > 0 && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-700">
          Nenhum paciente vinculado.{" "}
          <Link to="/app/pacientes" className="font-semibold underline">
            Vincular paciente primeiro →
          </Link>
        </div>
      )}

      {assigningId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg space-y-4">
            <h3 className="text-base font-semibold text-gray-800">Atribuir preset a um paciente</h3>

            <select
              value={assignCareLinkId}
              onChange={(e) => setAssignCareLinkId(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Selecione um paciente...</option>
              {careLinks.map((l) => (
                <option key={l.id} value={String(l.id)}>
                  {l.patient_username ?? `Paciente ${l.patient_id.slice(0, 8)}`}
                </option>
              ))}
            </select>

            {assignError && <p className="text-sm text-red-600">{assignError}</p>}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAssigningId(null)}
                disabled={assignSubmitting}
                className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAssign}
                disabled={!assignCareLinkId || assignSubmitting}
                className="h-10 px-5 rounded-xl bg-yellow-400 font-semibold text-gray-900 hover:bg-yellow-500 disabled:opacity-60 transition"
              >
                {assignSubmitting ? "Criando..." : "Criar plano"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

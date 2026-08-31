import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api, getApiErrorMessage } from "../lib/api";
import BackLink from "../components/BackLink";
import { useProfile } from "../profile/useProfile";
import type { ProfileDetails } from "../profile/types";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "Sedentário" },
  { value: "light", label: "Levemente ativo" },
  { value: "moderate", label: "Moderadamente ativo" },
  { value: "active", label: "Muito ativo" },
  { value: "very_active", label: "Extremamente ativo" },
];

const SEX_OPTIONS = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Feminino" },
  { value: "other", label: "Outro / Prefiro não informar" },
];

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { refreshProfile } = useProfile();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Base fields
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Nutritionist fields
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");

  // Patient fields
  const [goalSummary, setGoalSummary] = useState("");
  const [foodRestrictions, setFoodRestrictions] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");

  useEffect(() => {
    api
      .get<ProfileDetails>("/profile/me/details")
      .then((res) => {
        const p = res.data;
        setProfile(p);
        setUsername(p.profile.username);
        setPhone(p.profile.phone ?? "");
        setAvatarUrl(p.profile.avatar_url ?? "");
        if (p.nutritionist_profile) {
          setSpecialty(p.nutritionist_profile.specialty ?? "");
          setBio(p.nutritionist_profile.bio ?? "");
        }
        if (p.patient_profile) {
          setGoalSummary(p.patient_profile.goal_summary ?? "");
          setFoodRestrictions(p.patient_profile.food_restrictions ?? "");
          setBirthDate(p.patient_profile.birth_date ?? "");
          setSex(p.patient_profile.sex ?? "");
          setHeightCm(p.patient_profile.height_cm ? String(p.patient_profile.height_cm) : "");
          setActivityLevel(p.patient_profile.activity_level ?? "");
          setMedicalNotes(p.patient_profile.medical_notes ?? "");
        }
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Apenas imagens (JPEG, PNG, WEBP ou GIF) são permitidas.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError("A imagem excede o limite de 5MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadingAvatar(true);
    try {
      // `api`'s default Content-Type is application/json, which makes axios
      // JSON-serialize (and destroy) a FormData body unless we clear it here.
      const res = await api.post<ProfileDetails["profile"]>(
        "/profile/me/avatar",
        formData,
        { headers: { "Content-Type": undefined as unknown as string } },
      );
      setAvatarUrl(res.data.avatar_url ?? "");
      await refreshProfile();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      setError("O nome de usuário é obrigatório.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);

    const payload: Record<string, unknown> = {
      username: username.trim(),
      phone: phone.trim() || null,
    };

    if (profile?.profile.role === "nutritionist") {
      payload.nutritionist_profile = {
        specialty: specialty.trim() || null,
        bio: bio.trim() || null,
      };
    }

    if (profile?.profile.role === "patient") {
      payload.patient_profile = {
        goal_summary: goalSummary.trim() || null,
        food_restrictions: foodRestrictions.trim() || null,
        birth_date: birthDate || null,
        sex: sex || null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        activity_level: activityLevel || null,
        medical_notes: medicalNotes.trim() || null,
      };
    }

    try {
      await api.patch("/profile/me", payload);
      setSuccess(true);
      setTimeout(() => navigate("/app"), 1200);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Carregando perfil...</p>
      </main>
    );
  }

  const role = profile?.profile.role;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="mx-auto max-w-xl flex items-center justify-between">
          <div>
            <BackLink to="/app" label="Dashboard" />
            <h1 className="mt-0.5 text-xl font-bold text-gray-900">Editar Perfil</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Dados básicos */}
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Dados pessoais</h2>

            {/* Avatar preview */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xl font-bold text-orange-500 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  (username[0] ?? "?").toUpperCase()
                )}
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">Foto de perfil</label>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="h-10 px-4 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:border-orange-300 hover:text-orange-500 disabled:opacity-60 transition"
                >
                  {uploadingAvatar ? "Enviando..." : "Alterar foto"}
                </button>
                <p className="mt-1 text-xs text-gray-400">JPEG, PNG, WEBP ou GIF, até 5MB.</p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nome de exibição <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </section>

          {/* Nutricionista */}
          {role === "nutritionist" && (
            <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Dados profissionais</h2>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Especialidade</label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Ex: Nutrição Esportiva"
                  className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Bio / Apresentação</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Fale um pouco sobre você e sua atuação"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>
            </section>
          )}

          {/* Paciente */}
          {role === "patient" && (
            <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Dados de saúde</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Data de nascimento</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Sexo</label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="">Selecione</option>
                    {SEX_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Altura (cm)</label>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    min="100"
                    max="250"
                    step="1"
                    placeholder="170"
                    className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nível de atividade</label>
                  <select
                    value={activityLevel}
                    onChange={(e) => setActivityLevel(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="">Selecione</option>
                    {ACTIVITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Objetivo</label>
                <input
                  type="text"
                  value={goalSummary}
                  onChange={(e) => setGoalSummary(e.target.value)}
                  placeholder="Ex: Perder 5kg até julho"
                  className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Restrições alimentares</label>
                <input
                  type="text"
                  value={foodRestrictions}
                  onChange={(e) => setFoodRestrictions(e.target.value)}
                  placeholder="Ex: Intolerante a lactose, alergia a amendoim"
                  className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Observações médicas</label>
                <textarea
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  rows={2}
                  placeholder="Condições de saúde relevantes para o nutricionista"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>
            </section>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
          )}
          {success && (
            <p className="rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-600">
              Perfil atualizado com sucesso!
            </p>
          )}

          <div className="flex items-center justify-end gap-4 pb-8">
            <Link to="/app" className="text-sm text-gray-500 hover:text-gray-700">
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="h-11 px-6 rounded-xl bg-yellow-400 font-semibold text-gray-900 hover:bg-yellow-500 disabled:opacity-60 transition"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

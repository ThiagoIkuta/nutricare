import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";

import { getApiErrorMessage } from "../lib/api";
import { useProfile } from "../profile/useProfile";
import {
  clearProfileSetupPrefill,
  readProfileSetupPrefill,
} from "../profile/setupPrefill";
import type { ProfileRole, ProfileSetupPayload } from "../profile/types";

type FormData = {
  username: string;
  role: ProfileRole;
  phone: string;
  crn: string;
  specialty: string;
  bio: string;
};

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { profile, setupProfile, status } = useProfile();
  const profilePrefill = readProfileSetupPrefill();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, watch } = useForm<FormData>({
    defaultValues: {
      phone: profilePrefill?.phone || "",
      role: "patient",
      username: profilePrefill?.username || "",
    },
  });

  const role = watch("role");

  useEffect(() => {
    if (status === "ready" && profile) {
      clearProfileSetupPrefill();
    }
  }, [profile, status]);

  if (status === "ready" && profile) {
    return <Navigate to="/app" replace />;
  }

  async function onSubmit(data: FormData) {
    const payload: ProfileSetupPayload = {
      username: data.username,
      role: data.role,
    };

    if (data.phone.trim()) {
      payload.phone = data.phone.trim();
    }

    if (data.role === "nutritionist") {
      payload.nutritionist_profile = {
        crn: data.crn.trim(),
      };

      if (data.specialty.trim()) {
        payload.nutritionist_profile.specialty = data.specialty.trim();
      }

      if (data.bio.trim()) {
        payload.nutritionist_profile.bio = data.bio.trim();
      }
    } else {
      payload.patient_profile = {};
    }

    setSubmissionError(null);
    setIsSubmitting(true);

    try {
      await setupProfile(payload);
      clearProfileSetupPrefill();
      navigate("/app", { replace: true });
    } catch (error) {
      setSubmissionError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">
          Complete seu perfil
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          Seu acesso ja esta ativo. Falta apenas o perfil inicial para continuar.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <input
            placeholder="Nome de exibição"
            {...register("username", { required: true })}
            className="input"
          />

          <input
            placeholder="Telefone"
            {...register("phone")}
            className="input"
          />

          <div className="grid gap-3 md:grid-cols-2">
            <label className="rounded-xl border border-gray-300 p-4 text-sm text-gray-700">
              <input
                type="radio"
                value="patient"
                {...register("role", { required: true })}
                className="mr-2"
              />
              Paciente
            </label>

            <label className="rounded-xl border border-gray-300 p-4 text-sm text-gray-700">
              <input
                type="radio"
                value="nutritionist"
                {...register("role", { required: true })}
                className="mr-2"
              />
              Nutricionista
            </label>
          </div>

          {role === "nutritionist" ? (
            <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <input
                placeholder="CRN"
                {...register("crn", { required: role === "nutritionist" })}
                className="input"
              />

              <input
                placeholder="Especialidade"
                {...register("specialty")}
                className="input"
              />

              <textarea
                placeholder="Bio"
                {...register("bio")}
                className="min-h-28 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          ) : null}

          {submissionError ? (
            <p className="text-sm text-red-600">{submissionError}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Salvando..." : "Salvar perfil"}
          </button>
        </form>
      </div>
    </main>
  );
}

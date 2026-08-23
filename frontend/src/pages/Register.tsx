import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Mail } from "lucide-react";

import { useAuth } from "../auth/useAuth";
import type { AuthSession, SignupResponse } from "../auth/types";
import { api, getApiErrorMessage } from "../lib/api";
import logo from "../assets/logo.png";
import Navbar from "../components/Navbar";

type FormData = {
  email: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
};

export default function Register() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>();
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  async function onSubmit(data: FormData) {
    setError(null);

    if (data.password !== data.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (!data.terms) {
      setError("Você precisa aceitar os termos para continuar.");
      return;
    }

    try {
      const res = await api.post<SignupResponse>("/auth/signup", {
        email: data.email,
        password: data.password,
      });

      if (res.data.session_created && res.data.access_token) {
        const session: AuthSession = {
          access_token: res.data.access_token,
          refresh_token: res.data.refresh_token ?? "",
          token_type: "bearer",
          user: {
            id: res.data.user_id,
            email: res.data.email,
            phone: null,
            app_metadata: {},
            user_metadata: {},
          },
        };
        setSession(session, "local");
        navigate("/profile/setup");
      } else {
        setEmailSent(true);
      }
    } catch (err) {
      setError(getApiErrorMessage(err) || "Erro ao criar conta. Tente novamente.");
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center px-6 min-h-[calc(100vh-4rem)]">
          <div className="text-center max-w-md">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                <Mail className="h-8 w-8 text-orange-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifique seu e-mail</h2>
            <p className="text-sm text-gray-500 mb-6">
              Enviamos um link de confirmação para o seu e-mail. Clique no link para ativar sua conta e depois faça login.
            </p>
            <Link
              to="/login"
              className="inline-block rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition"
            >
              Ir para o login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="flex min-h-[calc(100vh-4rem)]">

      {/* Lado esquerdo */}
      <div className="w-[35%] bg-orange-500 hidden lg:block" />

      {/* Lado direito */}
      <div className="flex w-full lg:w-[65%] items-center justify-center px-6">

        <div className="w-full max-w-md">

          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={logo} alt="NutriCare" className="h-8 w-8 object-contain" />
            <h1 className="text-2xl font-bold text-center">NutriCare</h1>
          </div>
          <p className="text-center text-sm text-gray-500 mb-8">Crie sua conta gratuitamente</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <input
              type="email"
              placeholder="Email"
              {...register("email", { required: true })}
              className="input"
            />

            <input
              type="password"
              placeholder="Senha"
              {...register("password", { required: true })}
              className="input"
            />

            <input
              type="password"
              placeholder="Confirmar Senha"
              {...register("confirmPassword", { required: true })}
              className="input"
            />

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" {...register("terms")} />
              Li e concordo com os termos
            </label>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-yellow-400 rounded-xl font-semibold hover:bg-yellow-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Criando conta..." : "Criar conta"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Já tem conta?{" "}
            <Link to="/login" className="text-orange-500 hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

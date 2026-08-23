import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

import { useAuth } from "../auth/useAuth";
import type { AuthSession } from "../auth/types";
import { api, getApiErrorMessage } from "../lib/api";
import logo from "../assets/logo.png";

type FormData = {
  email: string;
  password: string;
  remember: boolean;
};

export default function Login() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      const res = await api.post<AuthSession>("/auth/login", {
        email: data.email,
        password: data.password,
      });
      setSession(res.data, data.remember ? "local" : "session");
      navigate("/app");
    } catch (err) {
      setError(getApiErrorMessage(err) || "Email ou senha inválidos.");
    }
  }

  return (
    <div className="min-h-screen flex font-[Inter] bg-[#f5f5f5]">

      {/* Lado esquerdo */}
      <div className="w-[35%] bg-orange-500 hidden lg:block" />

      {/* Lado direito */}
      <div className="flex w-full lg:w-[65%] items-center justify-center px-6">

        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <img src={logo} alt="NutriCare" className="h-10 w-10" />
            <h1 className="text-3xl font-bold text-gray-900">NutriCare</h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            <input
              type="email"
              placeholder="Email"
              {...register("email", { required: true })}
              className="w-full h-11 px-4 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-400"
            />

            <input
              type="password"
              placeholder="Senha"
              {...register("password", { required: true })}
              className="w-full h-11 px-4 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-400"
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600">
                <input type="checkbox" {...register("remember")} />
                Lembrar acesso
              </label>
              <a href="#" className="text-orange-500 hover:underline">
                Esqueci minha senha
              </a>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-yellow-400 font-semibold text-gray-900 hover:bg-yellow-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="text-sm text-gray-500 font-semibold">OU</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>

          {/* Social */}
          <div className="space-y-3">
            <button
              type="button"
              className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              <span className="text-sm font-medium text-gray-700">Entrar com Google</span>
            </button>
            <button
              type="button"
              className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition"
            >
              <img src="https://www.svgrepo.com/show/303110/apple-black-logo.svg" alt="Apple" className="w-5 h-5" />
              <span className="text-sm font-medium text-gray-700">Entrar com Apple</span>
            </button>
          </div>

          <p className="text-center text-sm text-gray-600 mt-8">
            Não tem cadastro?{" "}
            <Link to="/register" className="text-orange-500 hover:underline">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

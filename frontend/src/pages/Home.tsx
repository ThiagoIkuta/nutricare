import { Link } from "react-router-dom";
import { ClipboardList, Salad, ShoppingCart, RefreshCw, Check } from "lucide-react";

import Navbar from "../components/Navbar";

const FEATURES = [
  {
    icon: <ClipboardList className="h-6 w-6 text-orange-500" />,
    title: "Planos alimentares",
    description:
      "Crie dietas completas com refeições, quantidades, calorias e orientações personalizadas para cada paciente.",
  },
  {
    icon: <Salad className="h-6 w-6 text-orange-500" />,
    title: "Checklist de refeições",
    description:
      "Pacientes marcam cada refeição conforme consomem, com barra de progresso diária e histórico semanal.",
  },
  {
    icon: <ShoppingCart className="h-6 w-6 text-orange-500" />,
    title: "Lista de compras automática",
    description:
      "Gerada automaticamente a partir do plano alimentar, para o dia ou para a semana inteira.",
  },
  {
    icon: <RefreshCw className="h-6 w-6 text-orange-500" />,
    title: "Substituições de alimentos",
    description:
      "Nutricionistas indicam alternativas para cada alimento, respeitando preferências e restrições.",
  },
];

const PLANS = [
  {
    name: "Básico",
    price: "Grátis",
    period: "",
    description: "Para começar e explorar a plataforma.",
    features: ["Até 5 pacientes", "Planos alimentares ilimitados", "Lista de compras", "Suporte por e-mail"],
    cta: "Começar grátis",
    highlight: false,
  },
  {
    name: "Profissional",
    price: "R$ 49",
    period: "/mês",
    description: "Para nutricionistas em plena atividade.",
    features: ["Pacientes ilimitados", "Tudo do Básico", "Substituições de alimentos", "Relatórios de adesão", "Suporte prioritário"],
    cta: "Assinar agora",
    highlight: true,
  },
  {
    name: "Clínica",
    price: "R$ 129",
    period: "/mês",
    description: "Para equipes e clínicas de nutrição.",
    features: ["Múltiplos nutricionistas", "Tudo do Profissional", "Painel da clínica", "Integrações", "Gerente de conta dedicado"],
    cta: "Falar com vendas",
    highlight: false,
  },
];

export default function Home() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />

      {/* HERO */}
      <section className="bg-orange-500 py-24 px-6 text-center">
        <div className="mx-auto max-w-2xl">
          <span className="inline-block rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold text-orange-100 mb-5">
            Plataforma de nutrição clínica
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
            Gerencie dietas e pacientes com facilidade
          </h1>
          <p className="text-orange-100 text-base md:text-lg mb-8 max-w-xl mx-auto">
            Crie planos alimentares personalizados, acompanhe a adesão dos seus pacientes
            e gere listas de compras automaticamente — tudo em um só lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="rounded-xl bg-yellow-400 px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-yellow-300 transition shadow-sm"
            >
              Começar grátis
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-orange-300 bg-orange-400 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section id="funcoes" className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">
            Tudo que você precisa
          </h2>
          <p className="text-center text-sm text-gray-400 mb-10">
            Ferramentas pensadas para o dia a dia do nutricionista e do paciente.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-orange-200 transition"
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="py-20 px-6 bg-white border-t border-gray-100">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">
            Planos e Preços
          </h2>
          <p className="text-center text-sm text-gray-400 mb-10">
            Sem taxas ocultas. Cancele quando quiser.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  plan.highlight
                    ? "border-orange-400 bg-orange-500 text-white shadow-lg shadow-orange-100"
                    : "border-gray-200 bg-white"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-bold text-gray-900">
                    Mais popular
                  </span>
                )}

                <div className="mb-4">
                  <p className={`text-sm font-semibold mb-1 ${plan.highlight ? "text-orange-100" : "text-gray-500"}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-baseline gap-0.5">
                    <span className={`text-3xl font-bold ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className={`text-sm ${plan.highlight ? "text-orange-100" : "text-gray-400"}`}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${plan.highlight ? "text-orange-100" : "text-gray-400"}`}>
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm">
                      <Check
                        className={`h-4 w-4 shrink-0 ${plan.highlight ? "text-yellow-300" : "text-orange-500"}`}
                      />
                      <span className={plan.highlight ? "text-white" : "text-gray-600"}>
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`block text-center rounded-xl py-2.5 text-sm font-semibold transition ${
                    plan.highlight
                      ? "bg-white text-orange-500 hover:bg-orange-50"
                      : "bg-orange-500 text-white hover:bg-orange-600"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 py-8 px-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} NutriCare. Todos os direitos reservados.
      </footer>
    </div>
  );
}

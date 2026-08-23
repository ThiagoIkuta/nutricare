import { Link } from "react-router-dom";

import logo from "../assets/logo.png";

export default function Navbar() {
  return (
    <header className="w-full bg-white shadow-sm">
      <div className="relative max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="NutriCare" className="h-9 w-9 object-contain" />
          <h1 className="text-xl font-bold text-gray-900">
            NutriCare
          </h1>
        </Link>

        {/* Menu — centralizado absolutamente */}
        <nav className="hidden md:flex gap-6 text-sm text-gray-600 absolute left-1/2 -translate-x-1/2">
          <a
            href="/#funcoes"
            className="relative transition hover:text-orange-500 after:content-[''] after:absolute after:left-0 after:-bottom-1 after:w-0 after:h-[2px] after:bg-orange-500 after:transition-all hover:after:w-full"
          >
            Funções
          </a>
          <a
            href="/#planos"
            className="relative transition hover:text-orange-500 after:content-[''] after:absolute after:left-0 after:-bottom-1 after:w-0 after:h-[2px] after:bg-orange-500 after:transition-all hover:after:w-full"
          >
            Planos
          </a>
        </nav>

        {/* Ações */}
        <div className="flex items-center gap-3">
          <Link
            to="/register"
            className="rounded-lg border border-green-400 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-50 transition"
          >
            Começar grátis
          </Link>

          <Link
            to="/login"
            className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-green-600 transition"
          >
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}
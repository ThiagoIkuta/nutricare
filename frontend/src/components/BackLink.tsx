import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type BackLinkProps = {
  to: string;
  label?: string;
  className?: string;
};

export default function BackLink({ to, label = "Voltar", className = "" }: BackLinkProps) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-orange-500 hover:text-orange-600 transition ${className}`}
    >
      <ArrowLeft className="h-5 w-5" />
      {label}
    </Link>
  );
}

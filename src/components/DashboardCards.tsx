import React from "react";
import { FileText, Clock, CheckCircle2, Award } from "lucide-react";
import { CertificadoMeta } from "@/services/certificadoService";

interface DashboardCardsProps {
  certificados: CertificadoMeta[];
  loading: boolean;
}

const DashboardCards: React.FC<DashboardCardsProps> = ({ certificados, loading }) => {
  const total = certificados.length;
  const pendentes = certificados.filter((c) => c.status === "pendente").length;
  const aprovados = certificados.filter((c) => c.status === "aprovado").length;
  const horasTotal = certificados.reduce(
    (sum, c) => sum + (c.status === "aprovado" && c.horasAprovadas ? c.horasAprovadas : 0),
    0
  );

  const cards = [
    { label: "Certificados", value: total, icon: FileText, iconBg: "bg-primary/10", iconColor: "text-primary" },
    { label: "Pendentes", value: pendentes, icon: Clock, iconBg: "bg-secondary/10", iconColor: "text-secondary" },
    { label: "Aprovados", value: aprovados, icon: CheckCircle2, iconBg: "bg-success/10", iconColor: "text-success" },
    { label: "Horas", value: `${horasTotal}h`, icon: Award, iconBg: "bg-primary/10", iconColor: "text-primary" },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-lg border bg-card px-3 py-2.5 shadow-sm flex items-center gap-2.5"
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${card.iconBg}`}>
              <Icon className={`h-4 w-4 ${card.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-bold text-foreground leading-none">{card.value}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{card.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardCards;

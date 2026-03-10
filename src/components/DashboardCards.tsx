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
    {
      label: "Certificados",
      value: total,
      icon: FileText,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Pendentes",
      value: pendentes,
      icon: Clock,
      iconBg: "bg-secondary/10",
      iconColor: "text-secondary",
    },
    {
      label: "Aprovados",
      value: aprovados,
      icon: CheckCircle2,
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      label: "Horas aprovadas",
      value: `${horasTotal}h`,
      icon: Award,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-bold text-foreground leading-none">
                  {card.value}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-tight">
                  {card.label}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardCards;

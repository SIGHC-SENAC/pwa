import React from "react";
import { FileText, Clock, CheckCircle2, XCircle, Award } from "lucide-react";
import type { CertificadoAdmin } from "@/services/adminCertificadoService";

interface Props {
  certificados: CertificadoAdmin[];
}

const AdminSummaryCards: React.FC<Props> = ({ certificados }) => {
  const total = certificados.length;
  const pendentes = certificados.filter((c) => c.status === "pendente").length;
  const aprovados = certificados.filter((c) => c.status === "aprovado").length;
  const rejeitados = certificados.filter((c) => c.status === "rejeitado").length;
  const totalHoras = certificados.reduce((sum, c) => sum + (c.horasAprovadas ?? 0), 0);

  const cards = [
    { label: "Total de envios", value: total, icon: FileText, color: "text-primary", bg: "bg-primary/10" },
    { label: "Pendentes", value: pendentes, icon: Clock, color: "text-status-pending", bg: "bg-warning/10" },
    { label: "Aprovados", value: aprovados, icon: CheckCircle2, color: "text-status-approved", bg: "bg-success/10" },
    { label: "Rejeitados", value: rejeitados, icon: XCircle, color: "text-status-rejected", bg: "bg-destructive/10" },
    { label: "Horas aprovadas", value: totalHoras, icon: Award, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.bg}`}>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">{c.value}</p>
          <p className="text-xs text-muted-foreground">{c.label}</p>
        </div>
      ))}
    </div>
  );
};

export default AdminSummaryCards;

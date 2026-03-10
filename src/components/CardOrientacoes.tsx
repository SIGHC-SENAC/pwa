import React from "react";
import { CheckCircle2 } from "lucide-react";

const orientacoes = [
  "Envie apenas certificados legíveis e completos",
  "O arquivo deve estar em formato PDF",
  "Envie um certificado por vez",
  "Tamanho máximo: 10 MB por arquivo",
  "O documento será analisado posteriormente pela coordenação",
];

const CardOrientacoes: React.FC = () => {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
      <h3 className="text-base sm:text-lg font-bold text-foreground">Orientações</h3>
      <ul className="mt-4 space-y-3">
        {orientacoes.map((text, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CardOrientacoes;

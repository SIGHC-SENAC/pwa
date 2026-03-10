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
    <ul className="space-y-3">
      {orientacoes.map((text, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
};

export default CardOrientacoes;

import React, { useEffect, useState } from "react";
import { GraduationCap, Target, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// TODO: Substituir por dados reais do Firestore
const MOCK_CURSO = {
  nomeCurso: "Análise e Desenvolvimento de Sistemas",
  cargaHorariaTotalCurso: 200,
};

interface ProgressoHorasProps {
  horasAprovadas: number;
  loading?: boolean;
}

const ProgressoHoras: React.FC<ProgressoHorasProps> = ({ horasAprovadas, loading }) => {
  const [animatedPercent, setAnimatedPercent] = useState(0);

  const { nomeCurso, cargaHorariaTotalCurso } = MOCK_CURSO;
  const horasRestantes = Math.max(0, cargaHorariaTotalCurso - horasAprovadas);
  const percentual = Math.min(100, Math.round((horasAprovadas / cargaHorariaTotalCurso) * 100));
  const concluido = horasAprovadas >= cargaHorariaTotalCurso;

  useEffect(() => {
    if (loading) return;
    const timeout = setTimeout(() => setAnimatedPercent(percentual), 200);
    return () => clearTimeout(timeout);
  }, [percentual, loading]);

  if (loading) {
    return <div className="h-20 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <GraduationCap className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-bold text-foreground truncate">{nomeCurso}</span>
        </div>
        <span className="text-sm font-bold text-primary shrink-0">{animatedPercent}%</span>
      </div>

      <Progress value={animatedPercent} className="h-2.5 bg-muted" />

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <span className="font-semibold text-foreground">{horasAprovadas}h</span> aprovadas
          </span>
          {!concluido && horasAprovadas > 0 && (
            <span>Faltam <span className="font-semibold text-foreground">{horasRestantes}h</span></span>
          )}
        </div>
        <span className="flex items-center gap-1">
          <Target className="h-3 w-3" />
          Meta: {cargaHorariaTotalCurso}h
        </span>
      </div>

      {horasAprovadas === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Envie seus certificados para começar a acumular horas.
        </p>
      )}

      {concluido && (
        <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          <span className="text-xs font-semibold text-success">Carga horária concluída! 🎉</span>
        </div>
      )}
    </div>
  );
};

export default ProgressoHoras;

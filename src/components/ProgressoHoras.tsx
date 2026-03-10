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
    return <div className="h-44 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <section className="animate-fade-in rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-muted/30 px-5 py-3.5 sm:px-6 sm:py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <GraduationCap className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-bold text-foreground">
            Progresso das Horas Complementares
          </h2>
          <p className="text-xs text-muted-foreground">
            Acompanhe seu avanço em relação à carga horária exigida do curso
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* Curso */}
        <p className="text-sm font-semibold text-foreground">{nomeCurso}</p>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="text-muted-foreground">
            <span className="font-bold text-foreground">{horasAprovadas}h</span> de{" "}
            <span className="font-bold text-foreground">{cargaHorariaTotalCurso}h</span> concluídas
          </span>
          {!concluido && horasAprovadas > 0 && (
            <span className="text-muted-foreground">
              Faltam <span className="font-bold text-foreground">{horasRestantes}h</span> para completar
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Progresso</span>
            <span className="text-sm font-bold text-primary">{animatedPercent}%</span>
          </div>
          <Progress
            value={animatedPercent}
            className="h-3 bg-muted"
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-primary" />
              Horas aprovadas
            </span>
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              Meta do curso: {cargaHorariaTotalCurso}h
            </span>
          </div>
        </div>

        {/* State messages */}
        {horasAprovadas === 0 && (
          <p className="text-xs text-muted-foreground italic">
            Você ainda não possui horas aprovadas. Envie seus certificados para começar!
          </p>
        )}

        {concluido && (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <span className="text-sm font-semibold text-success">
              Carga horária complementar concluída! 🎉
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProgressoHoras;

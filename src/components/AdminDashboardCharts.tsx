import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CertificadoMeta } from "@/services/certificadoService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Loader2, Users, FileCheck, FileX, Upload, ChevronDown } from "lucide-react";

interface Props {
  certificados: CertificadoMeta[];
  loading: boolean;
}

interface AlunoDoc {
  id: string;
  nome: string;
  cursoNome?: string;
  cursoId?: string;
}

const COLORS = {
  approved: "hsl(152, 60%, 40%)",
  rejected: "hsl(0, 72%, 51%)",
  pending: "hsl(33, 93%, 55%)",
  noUpload: "hsl(215, 10%, 45%)",
  primary: "hsl(210, 100%, 29%)",
  secondary: "hsl(33, 93%, 55%)",
};

const PIE_COLORS = [COLORS.approved, COLORS.rejected, COLORS.pending];

const AdminDashboardCharts: React.FC<Props> = ({ certificados, loading }) => {
  const [alunos, setAlunos] = useState<AlunoDoc[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(true);

  useEffect(() => {
    const fetchAlunos = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "aluno"));
        const snap = await getDocs(q);
        setAlunos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AlunoDoc)));
      } catch (err) {
        console.error("Erro ao buscar alunos:", err);
      } finally {
        setLoadingAlunos(false);
      }
    };
    fetchAlunos();
  }, []);

  const stats = useMemo(() => {
    const aprovados = certificados.filter((c) => c.status === "aprovado").length;
    const rejeitados = certificados.filter((c) => c.status === "rejeitado").length;
    const pendentes = certificados.filter((c) => c.status === "pendente").length;

    const uidsComUpload = new Set(certificados.map((c) => c.uid));
    const semUpload = alunos.filter((a) => !uidsComUpload.has(a.id));

    // Curso -> alunos
    const cursoMap = new Map<string, number>();
    alunos.forEach((a) => {
      const curso = a.cursoNome || "Sem curso";
      cursoMap.set(curso, (cursoMap.get(curso) || 0) + 1);
    });
    const cursoAlunos = Array.from(cursoMap.entries())
      .map(([curso, total]) => ({ curso: curso.length > 20 ? curso.slice(0, 20) + "…" : curso, total }))
      .sort((a, b) => b.total - a.total);

    return { aprovados, rejeitados, pendentes, semUpload: semUpload.length, cursoAlunos };
  }, [certificados, alunos]);

  const pieData = useMemo(() => [
    { name: "Aprovados", value: stats.aprovados },
    { name: "Rejeitados", value: stats.rejeitados },
    { name: "Pendentes", value: stats.pendentes },
  ], [stats]);

  // Per-student summary data
  const alunoChartData = useMemo(() => {
    const map = new Map<string, { nome: string; aprovados: number; rejeitados: number; pendentes: number }>();
    certificados.forEach((c) => {
      const existing = map.get(c.uid) || { nome: c.nomeAluno || "Sem nome", aprovados: 0, rejeitados: 0, pendentes: 0 };
      if (c.status === "aprovado") existing.aprovados++;
      else if (c.status === "rejeitado") existing.rejeitados++;
      else existing.pendentes++;
      map.set(c.uid, existing);
    });
    return Array.from(map.values())
      .map((a) => ({
        nome: (a.nome || "Sem nome").length > 15 ? (a.nome || "Sem nome").slice(0, 15) + "…" : (a.nome || "Sem nome"),
        Aprovados: a.aprovados,
        Rejeitados: a.rejeitados,
        Pendentes: a.pendentes,
      }))
      .sort((a, b) => (b.Aprovados + b.Rejeitados + b.Pendentes) - (a.Aprovados + a.Rejeitados + a.Pendentes));
  }, [certificados]);
  const isLoading = loading || loadingAlunos;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const [chartsOpen, setChartsOpen] = useState(false);

  return (
    <Collapsible open={chartsOpen} onOpenChange={setChartsOpen}>
      <Card className="shadow-sm">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base font-semibold text-foreground">
                📊 Dashboard — Gráficos
              </CardTitle>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${chartsOpen ? "rotate-180" : ""}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pie chart - Certificate status */}
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Status dos Certificados</p>
                {certificados.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum certificado registrado</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pieData.filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value, x, y, textAnchor }) => (
                          <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" fill="hsl(var(--foreground))" fontSize={12}>
                            {`${name}: ${value}`}
                          </text>
                        )}
                        labelLine={true}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "12px" }}
                        formatter={(value) => <span className="text-foreground">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Bar chart - Alunos por curso */}
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Alunos por Curso</p>
                {stats.cursoAlunos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stats.cursoAlunos} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis
                        type="category"
                        dataKey="curso"
                        width={120}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => [`${value} alunos`, "Total"]}
                      />
                      <Bar dataKey="total" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Bar chart - Resumo por aluno */}
            {alunoChartData.length > 0 && (
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Resumo por Aluno</p>
                <ResponsiveContainer width="100%" height={Math.max(260, alunoChartData.length * 40)}>
                  <BarChart data={alunoChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      width={130}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="Aprovados" stackId="a" fill={COLORS.approved} radius={[0, 0, 0, 0]} barSize={20} />
                    <Bar dataKey="Rejeitados" stackId="a" fill={COLORS.rejected} radius={[0, 0, 0, 0]} barSize={20} />
                    <Bar dataKey="Pendentes" stackId="a" fill={COLORS.pending} radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default AdminDashboardCharts;

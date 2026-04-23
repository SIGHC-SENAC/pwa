import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CertificadoMeta } from "@/services/certificadoService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Loader2, Users, FileCheck, FileX, Clock, Award, UserX,
} from "lucide-react";

interface Props {
  certificados: CertificadoMeta[];
  loading: boolean;
}

interface AlunoDoc {
  id: string;
  nome: string;
  cursoNome?: string;
}

const COLORS = {
  approved: "hsl(152, 60%, 40%)",
  rejected:  "hsl(0, 72%, 51%)",
  pending:   "hsl(33, 93%, 55%)",
  primary:   "hsl(210, 100%, 29%)",
};

const PIE_COLORS = [COLORS.approved, COLORS.rejected, COLORS.pending];

const AdminDashboardCharts: React.FC<Props> = ({ certificados, loading }) => {
  const [alunos, setAlunos] = useState<AlunoDoc[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "aluno"));
        const snap = await getDocs(q);
        setAlunos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AlunoDoc)));
      } catch {}
      finally { setLoadingAlunos(false); }
    };
    fetch();
  }, []);

  const stats = useMemo(() => {
    const aprovados  = certificados.filter((c) => c.status === "aprovado").length;
    const rejeitados = certificados.filter((c) => c.status === "rejeitado").length;
    const pendentes  = certificados.filter((c) => c.status === "pendente").length;
    const horasTotal = certificados.reduce((s, c) => s + (c.horasAprovadas || 0), 0);
    const uidsComUpload = new Set(certificados.map((c) => c.uid));
    const semUpload = alunos.filter((a) => !uidsComUpload.has(a.id)).length;

    const cursoMap = new Map<string, number>();
    alunos.forEach((a) => {
      const curso = a.cursoNome || "Sem curso";
      cursoMap.set(curso, (cursoMap.get(curso) || 0) + 1);
    });
    const cursoAlunos = Array.from(cursoMap.entries())
      .map(([curso, total]) => ({ curso: curso.length > 22 ? curso.slice(0, 22) + "…" : curso, total }))
      .sort((a, b) => b.total - a.total);

    return { aprovados, rejeitados, pendentes, horasTotal, semUpload, cursoAlunos };
  }, [certificados, alunos]);

  const pieData = useMemo(() => [
    { name: "Aprovados",  value: stats.aprovados },
    { name: "Rejeitados", value: stats.rejeitados },
    { name: "Pendentes",  value: stats.pendentes },
  ], [stats]);

  const alunoChartData = useMemo(() => {
    const map = new Map<string, { nome: string; Aprovados: number; Rejeitados: number; Pendentes: number }>();
    certificados.forEach((c) => {
      const e = map.get(c.uid) || { nome: c.nomeAluno || "—", Aprovados: 0, Rejeitados: 0, Pendentes: 0 };
      if (c.status === "aprovado") e.Aprovados++;
      else if (c.status === "rejeitado") e.Rejeitados++;
      else e.Pendentes++;
      map.set(c.uid, e);
    });
    return Array.from(map.values())
      .map((a) => ({ ...a, nome: a.nome.length > 16 ? a.nome.slice(0, 16) + "…" : a.nome }))
      .sort((a, b) => (b.Aprovados + b.Rejeitados + b.Pendentes) - (a.Aprovados + a.Rejeitados + a.Pendentes));
  }, [certificados]);

  const isLoading = loading || loadingAlunos;

  const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const kpis = [
    {
      label: "Total de Alunos",
      value: alunos.length,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Pendentes",
      value: stats.pendentes,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Aprovados",
      value: stats.aprovados,
      icon: FileCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Rejeitados",
      value: stats.rejeitados,
      icon: FileX,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Horas Aprovadas",
      value: `${stats.horasTotal}h`,
      icon: Award,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Sem Envio",
      value: stats.semUpload,
      icon: UserX,
      color: "text-muted-foreground",
      bg: "bg-muted",
    },
  ];

  return (
    <div className="space-y-6">

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="shadow-sm border">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-4.5 w-4.5 ${color}`} style={{ height: "18px", width: "18px" }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Pie — status dos certificados */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-foreground">Status dos Certificados</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {certificados.length === 0 ? (
              <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">
                Nenhum certificado registrado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                    formatter={(value) => <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar — alunos por curso */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-foreground">Alunos por Curso</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {stats.cursoAlunos.length === 0 ? (
              <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">
                Nenhum dado disponível
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.cursoAlunos} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis
                    type="category"
                    dataKey="curso"
                    width={130}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} alunos`, "Total"]} />
                  <Bar dataKey="total" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bar — resumo por aluno */}
      {alunoChartData.length > 0 && (
        <Card className="shadow-sm border">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-foreground">Resumo por Aluno</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={Math.max(240, alunoChartData.length * 38)}>
              <BarChart data={alunoChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={130}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "12px" }} formatter={(v) => <span style={{ color: "hsl(var(--foreground))" }}>{v}</span>} />
                <Bar dataKey="Aprovados"  stackId="a" fill={COLORS.approved} barSize={18} />
                <Bar dataKey="Rejeitados" stackId="a" fill={COLORS.rejected}  barSize={18} />
                <Bar dataKey="Pendentes"  stackId="a" fill={COLORS.pending}   radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboardCharts;

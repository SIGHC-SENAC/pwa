import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CertificadoMeta } from "@/services/certificadoService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from "recharts";
import {
  Loader2, Users, FileCheck, FileX, Upload, Award, TrendingUp,
  Clock, CheckCircle2, XCircle, GraduationCap, AlertTriangle, BookOpen,
} from "lucide-react";

interface Props {
  certificados: CertificadoMeta[];
  loading: boolean;
}

interface AlunoDoc {
  id: string;
  nome: string;
  email: string;
  cursoNome?: string;
  cursoId?: string;
  emailVerified?: boolean;
  createdAt?: number;
}

interface CursoDoc {
  id: string;
  nome: string;
  codigo: string;
  cargaHorariaComplementar: number;
}

const COLORS = {
  approved: "hsl(152, 60%, 40%)",
  rejected: "hsl(0, 72%, 51%)",
  pending: "hsl(33, 93%, 55%)",
  noUpload: "hsl(215, 10%, 55%)",
  primary: "hsl(210, 100%, 29%)",
  secondary: "hsl(33, 93%, 55%)",
  info: "hsl(210, 80%, 55%)",
};

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatDate(ts: { seconds: number } | null): string {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short",
  });
}

const CoordDashboard: React.FC<Props> = ({ certificados, loading }) => {
  const [alunos, setAlunos] = useState<AlunoDoc[]>([]);
  const [cursos, setCursos] = useState<CursoDoc[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [alunosSnap, cursosSnap] = await Promise.all([
          getDocs(query(collection(db, "users"), where("role", "==", "aluno"))),
          getDocs(collection(db, "cursos")),
        ]);
        setAlunos(alunosSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AlunoDoc)));
        setCursos(cursosSnap.docs.map((d) => ({ id: d.id, ...d.data() } as CursoDoc)));
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
      } finally {
        setLoadingExtra(false);
      }
    };
    fetchAll();
  }, []);

  // ── KPI computations ──
  const kpis = useMemo(() => {
    const aprovados = certificados.filter((c) => c.status === "aprovado").length;
    const rejeitados = certificados.filter((c) => c.status === "rejeitado").length;
    const pendentes = certificados.filter((c) => c.status === "pendente").length;
    const horasTotal = certificados.reduce((s, c) => s + (c.horasAprovadas || 0), 0);
    const uidsComUpload = new Set(certificados.map((c) => c.uid));
    const alunosSemUpload = alunos.filter((a) => !uidsComUpload.has(a.id)).length;
    const taxaAprovacao = certificados.length > 0
      ? Math.round((aprovados / (aprovados + rejeitados)) * 100) || 0
      : 0;
    return { aprovados, rejeitados, pendentes, horasTotal, alunosSemUpload, taxaAprovacao };
  }, [certificados, alunos]);

  // ── Monthly trend (last 6 months) ──
  const monthlyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const month = MONTHS[d.getMonth()];
      const year = d.getFullYear();
      const certs = certificados.filter((c) => {
        if (!c.createdAt) return false;
        const cd = new Date(c.createdAt.seconds * 1000);
        return cd.getMonth() === d.getMonth() && cd.getFullYear() === year;
      });
      return {
        mes: month,
        Enviados: certs.length,
        Aprovados: certs.filter((c) => c.status === "aprovado").length,
        Rejeitados: certs.filter((c) => c.status === "rejeitado").length,
      };
    });
  }, [certificados]);

  // ── Status distribution pie ──
  const pieData = useMemo(() => [
    { name: "Aprovados", value: kpis.aprovados },
    { name: "Rejeitados", value: kpis.rejeitados },
    { name: "Pendentes", value: kpis.pendentes },
  ].filter((d) => d.value > 0), [kpis]);

  // ── Alunos por curso bar ──
  const cursoData = useMemo(() => {
    const map = new Map<string, { nome: string; alunos: number; horas: number }>();
    alunos.forEach((a) => {
      const key = a.cursoNome || "Sem curso";
      const existing = map.get(key) || { nome: key.length > 18 ? key.slice(0, 18) + "…" : key, alunos: 0, horas: 0 };
      existing.alunos++;
      map.set(key, existing);
    });
    certificados.filter((c) => c.status === "aprovado").forEach((c) => {
      // try to find aluno's course
      const aluno = alunos.find((a) => a.id === c.uid);
      if (aluno) {
        const key = aluno.cursoNome || "Sem curso";
        const existing = map.get(key);
        if (existing) existing.horas += c.horasAprovadas || 0;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.alunos - a.alunos).slice(0, 8);
  }, [alunos, certificados]);

  // ── Recent activity ──
  const recentActivity = useMemo(() => {
    return [...certificados]
      .filter((c) => c.status !== "pendente")
      .sort((a, b) => (b.dataAnalise?.seconds ?? 0) - (a.dataAnalise?.seconds ?? 0))
      .slice(0, 8);
  }, [certificados]);

  // ── Alunos próximos de completar ──
  const alunosDestaque = useMemo(() => {
    const map = new Map<string, { nome: string; horas: number; cursoNome: string; cursoId: string }>();
    certificados.filter((c) => c.status === "aprovado").forEach((c) => {
      const aluno = alunos.find((a) => a.id === c.uid);
      if (!aluno) return;
      const existing = map.get(c.uid) || { nome: c.nomeAluno, horas: 0, cursoNome: aluno.cursoNome || "—", cursoId: aluno.cursoId || "" };
      existing.horas += c.horasAprovadas || 0;
      map.set(c.uid, existing);
    });

    return Array.from(map.values())
      .map((a) => {
        const curso = cursos.find((c) => c.id === a.cursoId);
        const meta = curso?.cargaHorariaComplementar || 80;
        const pct = Math.min(100, Math.round((a.horas / meta) * 100));
        return { ...a, meta, pct };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  }, [certificados, alunos, cursos]);

  const isLoading = loading || loadingExtra;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Alunos", value: alunos.length, icon: Users, color: "text-primary", bg: "bg-primary/8" },
          { label: "Certificados", value: certificados.length, icon: Upload, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Pendentes", value: kpis.pendentes, icon: Clock, color: "text-secondary", bg: "bg-secondary/10", alert: kpis.pendentes > 0 },
          { label: "Aprovados", value: kpis.aprovados, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Horas aprovadas", value: `${kpis.horasTotal}h`, icon: Award, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Taxa aprovação", value: `${kpis.taxaAprovacao}%`, icon: TrendingUp, color: "text-teal-600", bg: "bg-teal-50" },
        ].map((k) => (
          <Card key={k.label} className={`shadow-sm ${k.alert ? "ring-2 ring-secondary/40" : ""}`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] text-muted-foreground leading-tight">{k.label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground mt-0.5">{k.value}</p>
                </div>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.bg} shrink-0`}>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alert: alunos sem upload */}
      {kpis.alunosSemUpload > 0 && (
        <div className="flex items-center gap-3 rounded-lg border-l-4 border-l-secondary bg-secondary/5 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-secondary shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">{kpis.alunosSemUpload} aluno(s)</span> ainda não fizeram nenhum envio de certificado.
          </p>
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly trend */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Envios nos últimos 6 meses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradEnv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradAprov" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.approved} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={COLORS.approved} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Area type="monotone" dataKey="Enviados" stroke={COLORS.primary} fill="url(#gradEnv)" strokeWidth={2} dot={{ r: 3 }} />
                <Area type="monotone" dataKey="Aprovados" stroke={COLORS.approved} fill="url(#gradAprov)" strokeWidth={2} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Pie */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-primary" />
              Distribuição de Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {certificados.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                Nenhum certificado registrado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={[COLORS.approved, COLORS.rejected, COLORS.pending][i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alunos por curso */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Alunos por Curso
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cursoData.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, cursoData.length * 38)}>
                <BarChart data={cursoData} layout="vertical" margin={{ left: 8, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="nome" width={130} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(value: number, name: string) => [value, name === "alunos" ? "Alunos" : "Horas aprovadas"]}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="alunos" name="Alunos" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top alunos com mais horas */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Progresso dos Alunos (top 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alunosDestaque.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                Nenhum dado disponível
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {alunosDestaque.map((a) => (
                  <div key={a.nome} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground truncate max-w-[60%]">{a.nome}</span>
                      <span className="text-muted-foreground shrink-0">{a.horas}/{a.meta}h</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${a.pct}%`,
                          background: a.pct >= 100
                            ? COLORS.approved
                            : a.pct >= 70
                            ? COLORS.secondary
                            : COLORS.primary,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{a.cursoNome} — {a.pct}%</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentActivity.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              Nenhuma atividade recente
            </div>
          ) : (
            <div className="divide-y">
              {recentActivity.map((cert) => (
                <div key={cert.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${cert.status === "aprovado" ? "bg-green-100" : "bg-red-100"}`}>
                    {cert.status === "aprovado"
                      ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                      : <XCircle className="h-4 w-4 text-red-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{cert.nomeAluno}</p>
                    <p className="text-xs text-muted-foreground truncate">{cert.nomeArquivo}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge
                      variant="outline"
                      className={cert.status === "aprovado"
                        ? "bg-green-50 text-green-700 border-green-200 text-[10px]"
                        : "bg-red-50 text-red-700 border-red-200 text-[10px]"
                      }
                    >
                      {cert.status === "aprovado" ? `+${cert.horasAprovadas}h` : "Rejeitado"}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(cert.dataAnalise)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CoordDashboard;

import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CertificadoMeta } from "@/services/certificadoService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Loader2, Users, FileCheck, FileX, Upload } from "lucide-react";

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

  const isLoading = loading || loadingAlunos;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const summaryCards = [
    { label: "Sem uploads", value: stats.semUpload, icon: Upload, bg: "bg-muted", color: "text-muted-foreground" },
    { label: "Aprovados", value: stats.aprovados, icon: FileCheck, bg: "bg-success/10", color: "text-success" },
    { label: "Rejeitados", value: stats.rejeitados, icon: FileX, bg: "bg-destructive/10", color: "text-destructive" },
    { label: "Alunos", value: alunos.length, icon: Users, bg: "bg-primary/10", color: "text-primary" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {summaryCards.map((s) => (
          <Card key={s.label} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
                <s.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart - Certificate status */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base font-semibold text-foreground">
              Status dos Certificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {certificados.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum certificado registrado</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
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
          </CardContent>
        </Card>

        {/* Bar chart - Alunos por curso */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base font-semibold text-foreground">
              Alunos por Curso
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardCharts;

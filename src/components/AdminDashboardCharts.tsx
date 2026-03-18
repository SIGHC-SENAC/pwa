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

  return (
    <div className="space-y-4 sm:space-y-6">
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

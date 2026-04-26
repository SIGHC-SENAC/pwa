import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fetchCursos, Curso } from "@/services/cursoService";
import { fetchTurmas, Turma } from "@/services/turmaService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  BookOpen, Users, GraduationCap, Shield, Loader2, CalendarRange,
} from "lucide-react";

interface AdminDoc { id: string; nome: string; email: string; cursos?: Array<{ nome: string; codigo?: string }>; cursoNome?: string; }
interface AlunoDoc  { id: string; nome: string; cursoNome?: string; cursoId?: string; cursos?: Array<{ nome: string; codigo?: string }>; }

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

const SuperAdminDashboard: React.FC = () => {
  const [cursos,       setCursos]       = useState<Curso[]>([]);
  const [turmas,       setTurmas]       = useState<Turma[]>([]);
  const [alunos,       setAlunos]       = useState<AlunoDoc[]>([]);
  const [admins,       setAdmins]       = useState<AdminDoc[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [c, t, aSnap, adSnap] = await Promise.all([
          fetchCursos(),
          fetchTurmas(),
          getDocs(query(collection(db, "users"), where("role", "==", "aluno"))),
          getDocs(query(collection(db, "users"), where("role", "==", "admin"))),
        ]);
        setCursos(c);
        setTurmas(t);
        setAlunos(aSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AlunoDoc)));
        setAdmins(adSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminDoc)));
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Alunos por curso para o gráfico
  const alunosPorCurso = useMemo(() => {
    const map = new Map<string, number>();
    alunos.forEach((a) => {
      const cursosAluno = a.cursos?.length ? a.cursos : [{ nome: a.cursoNome || "Sem curso" }];
      cursosAluno.forEach((cursoInfo) => {
        const nome = cursoInfo.nome || cursoInfo.codigo || "Sem curso";
        map.set(nome, (map.get(nome) || 0) + 1);
      });
    });
    return Array.from(map.entries())
      .map(([curso, total]) => ({
        curso: curso.length > 24 ? curso.slice(0, 24) + "…" : curso,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [alunos]);

  // Turmas por curso
  const turmasPorCurso = useMemo(() => {
    const map = new Map<string, number>();
    turmas.forEach((t) => {
      const nome = t.cursoNome || t.cursoCodigo || "Sem curso";
      map.set(nome, (map.get(nome) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([curso, total]) => ({
        curso: curso.length > 24 ? curso.slice(0, 24) + "…" : curso,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [turmas]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const kpis = [
    { label: "Cursos",        value: cursos.length,  icon: BookOpen,      bg: "bg-primary/10",      color: "text-primary" },
    { label: "Turmas",        value: turmas.length,  icon: CalendarRange, bg: "bg-violet-50",       color: "text-violet-600" },
    { label: "Alunos",        value: alunos.length,  icon: GraduationCap, bg: "bg-emerald-50",      color: "text-emerald-600" },
    { label: "Coordenadores", value: admins.length,  icon: Shield,        bg: "bg-amber-50",        color: "text-amber-600" },
  ];

  const BAR_COLOR = "hsl(210, 100%, 29%)";
  const BAR_COLOR_2 = "hsl(262, 60%, 55%)";

  return (
    <div className="space-y-6">

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map(({ label, value, icon: Icon, bg, color }) => (
          <Card key={label} className="shadow-sm border">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground leading-tight">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Alunos por curso */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Alunos por Curso
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {alunosPorCurso.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                Nenhum aluno cadastrado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, alunosPorCurso.length * 40)}>
                <BarChart data={alunosPorCurso} layout="vertical" margin={{ left: 8, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="curso" width={140} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} alunos`, "Total"]} />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={20}>
                    {alunosPorCurso.map((_, i) => (
                      <Cell key={i} fill={BAR_COLOR} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Turmas por curso */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-violet-600" />
              Turmas por Curso
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {turmasPorCurso.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                Nenhuma turma cadastrada
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, turmasPorCurso.length * 40)}>
                <BarChart data={turmasPorCurso} layout="vertical" margin={{ left: 8, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="curso" width={140} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} turmas`, "Total"]} />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={20}>
                    {turmasPorCurso.map((_, i) => (
                      <Cell key={i} fill={BAR_COLOR_2} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de coordenadores */}
      {admins.length > 0 && (
        <Card className="shadow-sm border">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600" />
              Coordenadores cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {admins.map((a) => {
                const initials = (a.nome || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.nome || "—"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{a.email}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SuperAdminDashboard;

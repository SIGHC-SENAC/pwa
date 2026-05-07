import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fetchCursos, Curso } from "@/services/cursoService";
import { fetchTurmas, Turma } from "@/services/turmaService";
import { fetchAllCertificados } from "@/services/adminService";
import { CertificadoMeta } from "@/services/certificadoService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  AlertTriangle, BookOpen, Clock3, FileCheck2, GraduationCap, Loader2, CalendarRange, Shield, Users,
} from "lucide-react";

interface AdminDoc {
  id: string;
  nome: string;
  email: string;
  cursoId?: string;
  cursoIds?: string[];
  cursos?: Array<{ id?: string; nome: string; codigo?: string }>;
  cursoNome?: string;
  createdAt?: number;
}

interface AlunoDoc {
  id: string;
  nome: string;
  email?: string;
  cursoNome?: string;
  cursoId?: string;
  cursoIds?: string[];
  cursos?: Array<{ id?: string; nome: string; codigo?: string }>;
  turmaId?: string;
  turmaNome?: string;
  createdAt?: number;
}

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  date: Date;
  type: "certificado" | "analise" | "aluno" | "admin" | "turma";
};

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

function getCourseIdsFromAluno(aluno: AlunoDoc): string[] {
  if (aluno.cursoIds?.length) return aluno.cursoIds.filter(Boolean);
  if (aluno.cursos?.length) {
    return aluno.cursos.map((curso) => curso.id).filter((id): id is string => Boolean(id));
  }
  return aluno.cursoId ? [aluno.cursoId] : [];
}

function getCourseIdsFromAdmin(admin: AdminDoc): string[] {
  if (admin.cursoIds?.length) return admin.cursoIds.filter(Boolean);
  if (admin.cursos?.length) {
    return admin.cursos.map((curso) => curso.id).filter((id): id is string => Boolean(id));
  }
  return admin.cursoId ? [admin.cursoId] : [];
}

function getTimestampDate(ts: { seconds: number; nanoseconds: number } | null | undefined): Date | null {
  if (!ts?.seconds) return null;
  return new Date(ts.seconds * 1000);
}

function getDateFromNumberish(value?: number | string | null): Date | null {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function formatDateBR(date: Date | null): string {
  if (!date) return "sem data";
  return date.toLocaleDateString("pt-BR");
}

function formatDateTimeBR(date: Date): string {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActivityAccent(type: ActivityItem["type"]): string {
  switch (type) {
    case "analise":
      return "border-l-emerald-500";
    case "certificado":
      return "border-l-amber-500";
    case "admin":
      return "border-l-primary";
    case "turma":
      return "border-l-violet-500";
    case "aluno":
    default:
      return "border-l-sky-500";
  }
}

const SuperAdminDashboard: React.FC = () => {
  const [cursos,       setCursos]       = useState<Curso[]>([]);
  const [turmas,       setTurmas]       = useState<Turma[]>([]);
  const [alunos,       setAlunos]       = useState<AlunoDoc[]>([]);
  const [admins,       setAdmins]       = useState<AdminDoc[]>([]);
  const [certificados, setCertificados] = useState<CertificadoMeta[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [activityExpanded, setActivityExpanded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [c, t, certs, aSnap, adSnap] = await Promise.all([
          fetchCursos(),
          fetchTurmas(),
          fetchAllCertificados(),
          getDocs(query(collection(db, "users"), where("role", "==", "aluno"))),
          getDocs(query(collection(db, "users"), where("role", "==", "admin"))),
        ]);
        setCursos(c);
        setTurmas(t);
        setCertificados(certs);
        setAlunos(aSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AlunoDoc)));
        setAdmins(adSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminDoc)));
      } catch {
        setCertificados([]);
      }
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

  const alertData = useMemo(() => {
    const courseIds = new Set(cursos.map((curso) => curso.id).filter((id): id is string => Boolean(id)));

    const adminsPorCurso = new Map<string, number>();
    admins.forEach((admin) => {
      getCourseIdsFromAdmin(admin).forEach((id) => {
        if (!courseIds.has(id)) return;
        adminsPorCurso.set(id, (adminsPorCurso.get(id) || 0) + 1);
      });
    });

    const alunosPorTurma = new Map<string, number>();
    alunos.forEach((aluno) => {
      if (!aluno.turmaId) return;
      alunosPorTurma.set(aluno.turmaId, (alunosPorTurma.get(aluno.turmaId) || 0) + 1);
    });

    const alunosComEnvio = new Set(certificados.map((certificado) => certificado.uid));

    const cursosSemCoordenador = cursos
      .filter((curso) => !adminsPorCurso.get(curso.id || ""))
      .map((curso) => curso.nome);

    const cursosSemTurma = cursos
      .filter((curso) => !turmas.some((turma) => turma.cursoId === curso.id))
      .map((curso) => curso.nome);

    const turmasSemAlunos = turmas
      .filter((turma) => !alunosPorTurma.get(turma.id || ""))
      .map((turma) => ({
        nome: turma.nome,
        cursoNome: turma.cursoNome || turma.cursoCodigo || "Sem curso",
      }));

    const alunosSemEnvio = alunos
      .filter((aluno) => !alunosComEnvio.has(aluno.id))
      .map((aluno) => aluno.nome);

    const cursosComPendenciaCritica = Array.from(
      certificados
        .filter((certificado) => certificado.status === "pendente")
        .reduce<Map<string, { nome: string; total: number }>>((map, certificado) => {
          const id = certificado.cursoId || "sem-curso";
          const nome = certificado.cursoNome || certificado.cursoCodigo || "Sem curso";
          const current = map.get(id) || { nome, total: 0 };
          current.total += 1;
          map.set(id, current);
          return map;
        }, new Map())
        .values()
    )
      .filter((entry) => entry.total >= 5)
      .sort((a, b) => b.total - a.total);

    const ultimaAnalise = certificados
      .filter((certificado) => certificado.dataAnalise)
      .sort((a, b) => (b.dataAnalise?.seconds ?? 0) - (a.dataAnalise?.seconds ?? 0))[0];

    return {
      cursosSemCoordenador,
      cursosSemTurma,
      turmasSemAlunos,
      alunosSemEnvio,
      cursosComPendenciaCritica,
      ultimaAnalise,
    };
  }, [admins, alunos, certificados, cursos, turmas]);

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    certificados.forEach((certificado) => {
      const createdAt = getTimestampDate(certificado.createdAt);
      if (createdAt) {
        items.push({
          id: `cert-${certificado.id}`,
          title: "Novo certificado enviado",
          description: `${certificado.nomeAluno} enviou ${certificado.nomeArquivo}`,
          date: createdAt,
          type: "certificado",
        });
      }

      const analysisDate = getTimestampDate(certificado.dataAnalise);
      if (analysisDate) {
        const acao = certificado.status === "aprovado" ? "aprovou" : "analisou";
        items.push({
          id: `analysis-${certificado.id}`,
          title: `Certificado ${certificado.status}`,
          description: `${certificado.nomeAdmin || "Administrador"} ${acao} o envio de ${certificado.nomeAluno}`,
          date: analysisDate,
          type: "analise",
        });
      }
    });

    alunos.forEach((aluno) => {
      const date = getDateFromNumberish(aluno.createdAt);
      if (!date) return;
      items.push({
        id: `aluno-${aluno.id}`,
        title: "Aluno cadastrado",
        description: `${aluno.nome} foi vinculado ao sistema${aluno.turmaNome ? ` na turma ${aluno.turmaNome}` : ""}`,
        date,
        type: "aluno",
      });
    });

    admins.forEach((admin) => {
      const date = getDateFromNumberish(admin.createdAt);
      if (!date) return;
      items.push({
        id: `admin-${admin.id}`,
        title: "Coordenador cadastrado",
        description: `${admin.nome} recebeu acesso administrativo`,
        date,
        type: "admin",
      });
    });

    turmas.forEach((turma) => {
      const date = getDateFromNumberish(turma.criadoEm);
      if (!date) return;
      items.push({
        id: `turma-${turma.id || turma.nome}`,
        title: "Turma cadastrada",
        description: `${turma.nome} foi criada para ${turma.cursoNome || turma.cursoCodigo || "um curso"}`,
        date,
        type: "turma",
      });
    });

    return items
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);
  }, [admins, alunos, certificados, turmas]);

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
  const activityPreview = recentActivity.slice(0, 3);
  const activityOverflow = recentActivity.slice(3);

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

      <Card className="shadow-sm border">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Alertas e exceções
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <p className="text-sm font-semibold text-amber-900">Cursos sem coordenador</p>
              <p className="mt-1 text-2xl font-bold text-amber-950">{alertData.cursosSemCoordenador.length}</p>
              <p className="mt-2 text-xs text-amber-800">
                {alertData.cursosSemCoordenador.slice(0, 3).join(", ") || "Nenhum curso sem responsável no momento."}
              </p>
            </div>

            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
              <p className="text-sm font-semibold text-violet-900">Cursos sem turma</p>
              <p className="mt-1 text-2xl font-bold text-violet-950">{alertData.cursosSemTurma.length}</p>
              <p className="mt-2 text-xs text-violet-800">
                {alertData.cursosSemTurma.slice(0, 3).join(", ") || "Todos os cursos possuem turmas cadastradas."}
              </p>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
              <p className="text-sm font-semibold text-rose-900">Alunos sem envio</p>
              <p className="mt-1 text-2xl font-bold text-rose-950">{alertData.alunosSemEnvio.length}</p>
              <p className="mt-2 text-xs text-rose-800">
                Alunos cadastrados que ainda não enviaram nenhum certificado.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-semibold text-foreground">Turmas sem alunos</p>
              <div className="mt-3 space-y-2">
                {alertData.turmasSemAlunos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma turma vazia encontrada.</p>
                ) : (
                  alertData.turmasSemAlunos.slice(0, 5).map((turma) => (
                    <div key={`${turma.cursoNome}-${turma.nome}`} className="rounded-lg border border-border/60 bg-background px-3 py-2">
                      <p className="text-sm font-medium text-foreground">{turma.nome}</p>
                      <p className="text-xs text-muted-foreground">{turma.cursoNome}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-semibold text-foreground">Pendências críticas por curso</p>
              <div className="mt-3 space-y-2">
                {alertData.cursosComPendenciaCritica.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum curso com 5 ou mais certificados pendentes.</p>
                ) : (
                  alertData.cursosComPendenciaCritica.map((curso) => (
                    <div key={curso.nome} className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2">
                      <p className="text-sm font-medium text-foreground">{curso.nome}</p>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                        {curso.total} pendente(s)
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border/70 bg-background px-4 py-3 text-sm text-muted-foreground">
            Última análise registrada:
            <span className="ml-1 font-medium text-foreground">
              {alertData.ultimaAnalise
                ? `${alertData.ultimaAnalise.nomeAdmin || "Administrador"} em ${formatDateBR(getTimestampDate(alertData.ultimaAnalise.dataAnalise))}`
                : "nenhuma análise encontrada"}
            </span>
          </div>
        </CardContent>
      </Card>

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

      <Card className="shadow-sm border">
        <CardHeader className="pb-2 pt-5 px-5">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" />
              Atividade recente
            </CardTitle>
            {activityOverflow.length > 0 && (
              <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                +{activityOverflow.length} item(ns)
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {recentActivity.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-sm text-muted-foreground">
              Nenhuma atividade recente encontrada.
            </div>
          ) : (
            <div className="space-y-3">
              {[...activityPreview, ...(activityExpanded ? activityOverflow : [])].map((activity) => (
                <div
                  key={activity.id}
                  className={`rounded-xl border border-border/70 border-l-4 bg-background px-4 py-3 ${getActivityAccent(activity.type)}`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <FileCheck2 className="h-3.5 w-3.5" />
                      {formatDateTimeBR(activity.date)}
                    </div>
                  </div>
                </div>
              ))}

              {activityOverflow.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => setActivityExpanded((current) => !current)}
                >
                  {activityExpanded ? "Ver menos" : "Ver mais"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;

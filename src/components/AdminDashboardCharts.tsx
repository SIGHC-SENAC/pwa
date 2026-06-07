import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CertificadoMeta } from "@/services/certificadoService";
import { fetchAllCertificados } from "@/services/adminService";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Award, Clock, FileCheck, FileX, Loader2, UserX, Users } from "lucide-react";

interface Props {
  cursoIds?: string[];
}

interface AlunoDoc {
  id: string;
  nome: string;
  email?: string;
  cursoId?: string;
  cursoNome?: string;
  cursoIds?: string[];
  cursos?: Array<{ id: string; nome: string; codigo?: string }>;
}

const COLORS = {
  blue: "#2563EB",
  orange: "#F59E0B",
  green: "#10B981",
  red: "#EF4444",
  violet: "#7C3AED",
  slate: "#64748B",
  border: "#E5E7EB",
  grid: "#EEF2F7",
  text: "#0F172A",
  muted: "#64748B",
};

const statusColors = [COLORS.green, COLORS.red, COLORS.orange];

const cardClass =
  "rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

const tooltipStyle = {
  background: "#FFFFFF",
  border: "1px solid #E5E7EB",
  borderRadius: "12px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.10)",
  color: COLORS.text,
  fontSize: "12px",
};

const AdminDashboardCharts: React.FC<Props> = ({ cursoIds = [] }) => {
  const isMobile = useIsMobile();
  const [certificados, setCertificados] = useState<CertificadoMeta[]>([]);
  const [alunos, setAlunos] = useState<AlunoDoc[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(true);
  const [loadingAlunos, setLoadingAlunos] = useState(true);

  useEffect(() => {
    fetchAllCertificados()
      .then((all) => {
        const visible = cursoIds.length
          ? all.filter((c) => !c.cursoId || cursoIds.includes(c.cursoId))
          : all;
        setCertificados(visible);
      })
      .catch(() => setCertificados([]))
      .finally(() => setLoadingCerts(false));
  }, [cursoIds]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "aluno"));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AlunoDoc));
        const filtrados = cursoIds.length
          ? data.filter((aluno) => {
              const ids = aluno.cursoIds?.length ? aluno.cursoIds : aluno.cursoId ? [aluno.cursoId] : [];
              return ids.some((id) => cursoIds.includes(id));
            })
          : data;
        setAlunos(filtrados);
      } catch {
        setAlunos([]);
      } finally {
        setLoadingAlunos(false);
      }
    };
    fetch();
  }, [cursoIds]);

  const stats = useMemo(() => {
    const aprovados = certificados.filter((c) => c.status === "aprovado").length;
    const rejeitados = certificados.filter((c) => c.status === "rejeitado").length;
    const pendentes = certificados.filter((c) => c.status === "pendente").length;
    const horasTotal = certificados.reduce((s, c) => s + (c.horasAprovadas || 0), 0);
    const uidsComUpload = new Set(certificados.map((c) => c.uid));
    const semUpload = alunos.filter((a) => !uidsComUpload.has(a.id)).length;

    const cursoMap = new Map<string, number>();
    alunos.forEach((a) => {
      const cursos = a.cursos?.length ? a.cursos : [{ id: a.cursoIds?.[0] || "", nome: a.cursoNome || "Sem curso" }];
      cursos.forEach((cursoInfo) => {
        const curso = cursoInfo.nome || cursoInfo.codigo || "Sem curso";
        cursoMap.set(curso, (cursoMap.get(curso) || 0) + 1);
      });
    });

    const cursoAlunos = Array.from(cursoMap.entries())
      .map(([curso, total]) => ({ curso, total }))
      .sort((a, b) => b.total - a.total);

    return { aprovados, rejeitados, pendentes, horasTotal, semUpload, cursoAlunos };
  }, [certificados, alunos]);

  const pieData = useMemo(
    () => [
      { name: "Aprovados", value: stats.aprovados },
      { name: "Rejeitados", value: stats.rejeitados },
      { name: "Pendentes", value: stats.pendentes },
    ],
    [stats]
  );

  const alunoChartData = useMemo(() => {
    const alunosPorId = new Map(alunos.map((aluno) => [aluno.id, aluno]));
    const map = new Map<
      string,
      { nome: string; Aprovados: number; Rejeitados: number; Pendentes: number; total: number }
    >();

    certificados.forEach((c) => {
      const aluno = alunosPorId.get(c.uid);
      const nomeAluno = c.nomeAluno || aluno?.nome || c.emailAluno || aluno?.email || "Aluno sem cadastro";
      const entry = map.get(c.uid) || {
        nome: nomeAluno,
        Aprovados: 0,
        Rejeitados: 0,
        Pendentes: 0,
        total: 0,
      };

      if (c.status === "aprovado") entry.Aprovados++;
      else if (c.status === "rejeitado") entry.Rejeitados++;
      else entry.Pendentes++;

      entry.total++;
      map.set(c.uid, entry);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [certificados, alunos]);

  const isLoading = loadingCerts || loadingAlunos;

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
      detail: "matriculados ativos",
      icon: Users,
      iconClass: "bg-blue-50 text-blue-600",
    },
    {
      label: "Pendentes",
      value: stats.pendentes,
      detail: "aguardando análise",
      icon: Clock,
      iconClass: "bg-amber-50 text-amber-600",
    },
    {
      label: "Aprovados",
      value: stats.aprovados,
      detail: "certificados validados",
      icon: FileCheck,
      iconClass: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Rejeitados",
      value: stats.rejeitados,
      detail: "com pendências",
      icon: FileX,
      iconClass: "bg-red-50 text-red-600",
    },
    {
      label: "Horas Aprovadas",
      value: `${stats.horasTotal}h`,
      detail: "carga horária aceita",
      icon: Award,
      iconClass: "bg-violet-50 text-violet-600",
    },
    {
      label: "Sem Envio",
      value: stats.semUpload,
      detail: "sem certificados",
      icon: UserX,
      iconClass: "bg-slate-100 text-slate-600",
    },
  ];

  const courseHeight = Math.max(250, Math.min(360, stats.cursoAlunos.length * 46 + 90));
  const alunoHeight = Math.max(260, Math.min(520, alunoChartData.length * 44 + 92));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {kpis.map(({ label, value, detail, icon: Icon, iconClass }) => (
          <div
            key={label}
            className={`${cardClass} p-4 transition duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,23,42,0.07)]`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold leading-none tracking-tight text-slate-950">{value}</p>
              </div>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 truncate text-xs text-slate-400">{detail}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className={`${cardClass} p-5 sm:p-6`}>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-950">Status dos Certificados</h2>
            <p className="mt-1 text-sm text-slate-500">Distribuição dos envios por situação.</p>
          </div>
          {certificados.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
              Nenhum certificado registrado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={292}>
              <PieChart margin={{ top: 4, right: 8, bottom: 14, left: 8 }}>
                <Pie
                  data={pieData.filter((d) => d.value > 0)}
                  cx="50%"
                  cy="45%"
                  dataKey="value"
                  innerRadius={70}
                  outerRadius={104}
                  paddingAngle={4}
                  stroke="#FFFFFF"
                  strokeWidth={4}
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={statusColors[index]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  align="center"
                  iconSize={9}
                  layout="horizontal"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: "12px", color: COLORS.muted }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className={`${cardClass} p-5 sm:p-6`}>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-950">Alunos por Curso</h2>
            <p className="mt-1 text-sm text-slate-500">Volume de estudantes cadastrados por curso.</p>
          </div>
          {stats.cursoAlunos.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
              Nenhum dado disponível
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={courseHeight}>
              <BarChart data={stats.cursoAlunos} layout="vertical" margin={{ top: 12, right: isMobile ? 12 : 24, bottom: 4, left: isMobile ? 4 : 18 }}>
                <CartesianGrid horizontal={true} vertical={false} stroke={COLORS.grid} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  axisLine={{ stroke: COLORS.border }}
                  tickLine={false}
                  tick={{ fill: COLORS.muted, fontSize: isMobile ? 10 : 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="curso"
                  width={isMobile ? 90 : 150}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLORS.muted, fontSize: isMobile ? 10 : 12 }}
                  tickFormatter={(v: string) => isMobile && v.length > 13 ? v.slice(0, 13) + "…" : v}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} alunos`, "Total"]} />
                <Bar dataKey="total" fill={COLORS.blue} radius={[0, 8, 8, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      <section className={`${cardClass} p-5 sm:p-6`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Resumo por Aluno</h2>
            <p className="mt-1 text-sm text-slate-500">Comparativo de certificados aprovados, pendentes e rejeitados.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Aprovados</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />Pendentes</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />Rejeitados</span>
          </div>
        </div>

        {alunoChartData.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
            Nenhum envio por aluno para exibir
          </div>
        ) : (
          <div className="overflow-hidden">
            <ResponsiveContainer width="100%" height={alunoHeight}>
              <BarChart data={alunoChartData} layout="vertical" margin={{ top: 12, right: isMobile ? 12 : 24, bottom: 4, left: isMobile ? 4 : 36 }}>
                <CartesianGrid horizontal={true} vertical={false} stroke={COLORS.grid} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  axisLine={{ stroke: COLORS.border }}
                  tickLine={false}
                  tick={{ fill: COLORS.muted, fontSize: isMobile ? 10 : 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={isMobile ? 110 : 190}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLORS.text, fontSize: isMobile ? 10 : 12 }}
                  tickFormatter={(v: string) => isMobile && v.length > 16 ? v.slice(0, 16) + "…" : v}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="Aprovados" stackId="status" fill={COLORS.green} barSize={18} radius={[8, 0, 0, 8]} />
                <Bar dataKey="Pendentes" stackId="status" fill={COLORS.orange} barSize={18} />
                <Bar dataKey="Rejeitados" stackId="status" fill={COLORS.red} barSize={18} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboardCharts;

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users, FileCheck, Award, BookOpen, ArrowRight, GraduationCap,
  Upload, CheckCircle2, TrendingUp,
} from "lucide-react";

interface SystemStats {
  totalAlunos: number;
  totalCertificados: number;
  totalAprovados: number;
  totalHoras: number;
  totalCursos: number;
}

const LandingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SystemStats>({
    totalAlunos: 0,
    totalCertificados: 0,
    totalAprovados: 0,
    totalHoras: 0,
    totalCursos: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [alunosSnap, certsSnap, cursosSnap] = await Promise.all([
          getDocs(query(collection(db, "users"), where("role", "==", "aluno"))),
          getDocs(collection(db, "certificados_horas_complementares")),
          getDocs(collection(db, "cursos")),
        ]);

        const certs = certsSnap.docs.map((d) => d.data());
        const aprovados = certs.filter((c) => c.status === "aprovado");
        const totalHoras = aprovados.reduce((s, c) => s + (c.horasAprovadas || 0), 0);

        setStats({
          totalAlunos: alunosSnap.size,
          totalCertificados: certs.length,
          totalAprovados: aprovados.length,
          totalHoras,
          totalCursos: cursosSnap.size,
        });
      } catch (err) {
        console.error("Erro ao buscar estatísticas:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statItems = [
    { label: "Alunos cadastrados", value: stats.totalAlunos, icon: Users, color: "text-primary", bg: "bg-primary/8" },
    { label: "Certificados enviados", value: stats.totalCertificados, icon: Upload, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Certificados aprovados", value: stats.totalAprovados, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
    { label: "Horas homologadas", value: `${stats.totalHoras}h`, icon: Award, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Cursos ativos", value: stats.totalCursos, icon: BookOpen, color: "text-teal-600", bg: "bg-teal-50" },
  ];

  return (
    <section className="w-full py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-8">
        {/* Section header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-4 py-1.5 text-xs font-semibold text-primary">
            <TrendingUp className="h-3.5 w-3.5" />
            Estatísticas do sistema
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Acompanhe o progresso da plataforma
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
            Dados atualizados em tempo real sobre certificados e horas complementares dos alunos.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {statItems.map((s) => (
            <Card key={s.label} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5 flex flex-col items-center text-center gap-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  {loading ? (
                    <div className="h-7 w-12 bg-muted animate-pulse rounded mx-auto" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  )}
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight mt-0.5">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How it works */}
        <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-6 text-center">Como funciona</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: Upload,
                title: "Envie seu certificado",
                desc: "Faça o upload do seu certificado em PDF. O sistema valida automaticamente a segurança do arquivo.",
              },
              {
                step: "02",
                icon: FileCheck,
                title: "Aguarde a análise",
                desc: "O coordenador analisa e homologa as horas complementares do seu certificado.",
              },
              {
                step: "03",
                icon: Award,
                title: "Acompanhe seu progresso",
                desc: "Visualize quantas horas já foram aprovadas e o quanto falta para completar a carga horária.",
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center gap-3">
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {item.step}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button onClick={() => navigate("/login")} size="lg" className="gap-2 px-8">
            Acessar o sistema
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default LandingDashboard;

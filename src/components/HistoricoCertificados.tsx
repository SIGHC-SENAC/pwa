import React, { useState } from "react";
import {
  FileText,
  ExternalLink,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  CalendarDays,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CertificadoMeta, formatFileSize } from "@/services/certificadoService";
import CertificadoDetailModal from "./CertificadoDetailModal";

interface HistoricoCertificadosProps {
  certificados: CertificadoMeta[];
  loading: boolean;
}

type FilterStatus = "todos" | "pendente" | "aprovado" | "rejeitado";

const statusConfig = {
  pendente: {
    label: "Pendente",
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    border: "border-l-amber-400",
    icon: Clock,
    dot: "bg-amber-400",
    detail: "bg-amber-50/60 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900",
    detailText: "text-amber-700 dark:text-amber-400",
  },
  aprovado: {
    label: "Aprovado",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    border: "border-l-emerald-500",
    icon: CheckCircle2,
    dot: "bg-emerald-500",
    detail: "bg-emerald-50/60 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900",
    detailText: "text-emerald-700 dark:text-emerald-400",
  },
  rejeitado: {
    label: "Não aprovado",
    badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
    border: "border-l-red-500",
    icon: XCircle,
    dot: "bg-red-500",
    detail: "bg-red-50/60 border-red-100 dark:bg-red-950/20 dark:border-red-900",
    detailText: "text-red-700 dark:text-red-400",
  },
};

function formatDate(ts: { seconds: number } | number | null | undefined, short = false): string {
  if (!ts) return "—";
  const ms =
    typeof ts === "number" ? (ts > 1e10 ? ts : ts * 1000) : ts.seconds * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "—";
  if (short) {
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateFilename(name: string, max = 40): string {
  if (name.length <= max) return name;
  const ext = name.lastIndexOf(".");
  if (ext > 0) {
    return name.slice(0, max - 4) + "…" + name.slice(ext);
  }
  return name.slice(0, max - 1) + "…";
}

const CardSkeleton: React.FC = () => (
  <div className="animate-pulse rounded-xl border border-border bg-card overflow-hidden border-l-4 border-l-muted">
    <div className="p-4 flex gap-3">
      <div className="h-10 w-10 rounded-lg bg-muted shrink-0" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="h-3.5 w-2/3 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
        <div className="h-3 w-1/3 rounded bg-muted" />
      </div>
      <div className="h-6 w-20 rounded-full bg-muted shrink-0" />
    </div>
    <div className="mx-4 mb-4 h-10 rounded-lg bg-muted/60" />
  </div>
);

const CertificadoCard: React.FC<{
  cert: CertificadoMeta;
  onClick: () => void;
}> = ({ cert, onClick }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[cert.status] ?? statusConfig.pendente;
  const StatusIcon = cfg.icon;

  const hasDetails =
    cert.status === "aprovado"
      ? cert.horasAprovadas != null || cert.observacaoAdmin || cert.nomeAdmin
      : cert.status === "rejeitado"
      ? cert.motivoRejeicao || cert.observacaoAdmin || cert.nomeAdmin
      : false;

  return (
    <div
      className={`group rounded-xl border border-border bg-card overflow-hidden border-l-4 ${cfg.border} transition-shadow hover:shadow-md`}
    >
      {/* Main row */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={onClick}
      >
        {/* File icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted mt-0.5">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground leading-snug truncate">
            {truncateFilename(cert.nomeArquivo)}
          </p>

          {cert.categoriaNome && (
            <p className="mt-0.5 text-xs text-primary font-medium truncate">
              {cert.categoriaNome}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3 shrink-0" />
              {formatDate(cert.createdAt, true)}
            </span>
            {cert.tamanhoBytes ? (
              <span className="hidden sm:block">{formatFileSize(cert.tamanhoBytes)}</span>
            ) : null}
          </div>
        </div>

        {/* Right side */}
        <div className="flex shrink-0 flex-col items-end gap-2 ml-2">
          <Badge
            variant="outline"
            className={`text-[11px] font-medium whitespace-nowrap ${cfg.badge}`}
          >
            <StatusIcon className="h-3 w-3 mr-1" />
            {cfg.label}
          </Badge>
          {cert.downloadURL && (
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <a href={cert.downloadURL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Detail section */}
      {cert.status === "pendente" && (
        <div className={`mx-4 mb-4 rounded-lg border px-3 py-2.5 ${cfg.detail}`}>
          <p className={`text-xs font-medium flex items-center gap-1.5 ${cfg.detailText}`}>
            <Clock className="h-3.5 w-3.5 shrink-0" />
            Aguardando análise do administrador
          </p>
        </div>
      )}

      {cert.status === "rejeitado" && cert.motivoRejeicao?.toLowerCase().includes("estrutura") && (
        <div className={`mx-4 mb-4 rounded-lg border px-3 py-2.5 ${cfg.detail}`}>
          <p className={`text-xs font-medium flex items-center gap-1.5 ${cfg.detailText}`}>
            <Shield className="h-3.5 w-3.5 shrink-0" />
            Rejeitado pela análise de segurança
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{cert.motivoRejeicao}</p>
        </div>
      )}

      {cert.status !== "pendente" && hasDetails && !(cert.status === "rejeitado" && cert.motivoRejeicao?.toLowerCase().includes("estrutura")) && (
        <div className={`mx-4 mb-4 rounded-lg border ${cfg.detail}`}>
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left"
          >
            <span className={`text-xs font-medium flex items-center gap-1.5 ${cfg.detailText}`}>
              <StatusIcon className="h-3.5 w-3.5 shrink-0" />
              {cert.status === "aprovado" ? "Detalhes da aprovação" : "Detalhes da rejeição"}
            </span>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>

          {expanded && (
            <div className="border-t border-inherit px-3 pb-3 pt-2.5 space-y-2">
              {cert.status === "aprovado" && cert.horasAprovadas != null && cert.horasAprovadas > 0 && (
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Horas aprovadas</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {cert.horasAprovadas}h
                  </span>
                </div>
              )}
              {cert.status === "rejeitado" && cert.motivoRejeicao && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Motivo</span>
                  <span className="text-xs text-foreground">{cert.motivoRejeicao}</span>
                </div>
              )}
              {cert.observacaoAdmin && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Observação</span>
                  <span className="text-xs text-foreground">{cert.observacaoAdmin}</span>
                </div>
              )}
              {cert.nomeAdmin && (
                <div className="flex items-center gap-1.5 pt-0.5 border-t border-inherit">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {cert.nomeAdmin}
                    {cert.dataAnalise && (
                      <> · {formatDate(cert.dataAnalise, true)}</>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const HistoricoCertificados: React.FC<HistoricoCertificadosProps> = ({
  certificados,
  loading,
}) => {
  const [selectedCert, setSelectedCert] = useState<CertificadoMeta | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("todos");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const counts = {
    todos: certificados.length,
    pendente: certificados.filter((c) => c.status === "pendente").length,
    aprovado: certificados.filter((c) => c.status === "aprovado").length,
    rejeitado: certificados.filter((c) => c.status === "rejeitado").length,
  };

  const filtered =
    filter === "todos" ? certificados : certificados.filter((c) => c.status === filter);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const filters: { id: FilterStatus; label: string; dot?: string }[] = [
    { id: "todos", label: "Todos" },
    { id: "pendente", label: "Pendentes", dot: "bg-amber-400" },
    { id: "aprovado", label: "Aprovados", dot: "bg-emerald-500" },
    { id: "rejeitado", label: "Não aprovados", dot: "bg-red-500" },
  ];

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      {certificados.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const count = counts[f.id];
            if (f.id !== "todos" && count === 0) return null;
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => { setFilter(f.id); setPage(1); }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${
                  active
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                {f.dot && (
                  <span className={`h-1.5 w-1.5 rounded-full ${f.dot}`} />
                )}
                {f.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                    active ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-4 text-base font-semibold text-foreground">
            {filter === "todos" ? "Nenhum certificado enviado" : `Nenhum certificado ${statusConfig[filter]?.label.toLowerCase() ?? ""}`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === "todos"
              ? "Seus certificados aparecerão aqui após o envio"
              : "Tente outro filtro acima"}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map((cert) => (
              <CertificadoCard
                key={cert.id}
                cert={cert}
                onClick={() => setSelectedCert(cert)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0 text-xs"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <CertificadoDetailModal
        cert={selectedCert}
        open={!!selectedCert}
        onClose={() => setSelectedCert(null)}
      />
    </div>
  );
};

export default HistoricoCertificados;

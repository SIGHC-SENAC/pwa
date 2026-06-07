import React from "react";
import {
  FileText,
  Upload,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  Shield,
  Layers,
} from "lucide-react";

// ── dados ────────────────────────────────────────────────────────────────────

const requisitos = [
  { icon: FileText, text: "Arquivo em formato PDF", detail: "Outros formatos (imagens, Word) não são aceitos" },
  { icon: Shield, text: "PDF legível e sem proteção por senha", detail: "Documentos ilegíveis ou criptografados são rejeitados automaticamente" },
  { icon: Layers, text: "Um certificado por envio", detail: "Envie um arquivo por vez para facilitar a análise" },
  { icon: Upload, text: "Tamanho máximo de 10 MB", detail: "Comprima o PDF caso esteja acima do limite" },
];

const etapas = [
  { numero: "1", titulo: "Envio", descricao: "Você seleciona a categoria e envia o PDF pelo botão flutuante." },
  { numero: "2", titulo: "Validação automática", descricao: "O sistema verifica a segurança e legibilidade do documento em segundos." },
  { numero: "3", titulo: "Análise da Coordenação", descricao: "Um coordenador avalia o conteúdo e registra as horas aprovadas." },
  { numero: "4", titulo: "Resultado", descricao: "Você recebe uma notificação com o status final: aprovado ou rejeitado." },
];

const faqs: { pergunta: string; resposta: string }[] = [
  {
    pergunta: "Quanto tempo leva a análise?",
    resposta: "O prazo varia conforme a demanda da Coordenação, mas costuma ocorrer em até 5 dias úteis após o envio.",
  },
  {
    pergunta: "Posso reenviar um documento rejeitado?",
    resposta: "Sim. Se o documento foi rejeitado por motivo de segurança ou ilegibilidade, corrija o problema e envie novamente. Se foi rejeitado pela Coordenação, verifique o motivo informado antes de reenviar.",
  },
  {
    pergunta: "Como saber quantas horas já foram aprovadas?",
    resposta: "Acesse a aba Dashboard para visualizar o progresso geral e o detalhamento por categoria de atividade.",
  },
  {
    pergunta: "Posso enviar certificados de cursos externos?",
    resposta: "Sim, desde que a atividade se enquadre em uma das categorias listadas no regulamento do seu curso.",
  },
];

// ── sub-componentes ──────────────────────────────────────────────────────────

function FaqItem({ pergunta, resposta }: { pergunta: string; resposta: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-3.5 text-left text-sm font-medium text-foreground hover:text-primary transition-colors"
      >
        <span>{pergunta}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{resposta}</p>
      )}
    </div>
  );
}

// ── componente principal ─────────────────────────────────────────────────────

const CardOrientacoes: React.FC = () => {
  return (
    <div className="space-y-6">

      {/* Aviso de destaque */}
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-950/20">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Atenção antes de enviar</p>
          <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-500">
            Certifique-se de que o documento é original, legível e pertence a uma atividade elegível ao seu curso.
            Envios inválidos são descartados automaticamente.
          </p>
        </div>
      </div>

      {/* Requisitos */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Requisitos do documento</h2>
        </div>
        <ul className="divide-y divide-border">
          {requisitos.map(({ icon: Icon, text, detail }, i) => (
            <li key={i} className="flex items-start gap-4 px-5 py-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{text}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Processo */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <Clock className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Como funciona o processo</h2>
        </div>
        <div className="p-5">
          <ol className="relative space-y-5 border-l-2 border-border pl-6">
            {etapas.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[1.65rem] flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {e.numero}
                </span>
                <p className="text-sm font-semibold text-foreground leading-tight">{e.titulo}</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{e.descricao}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* FAQ */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <HelpCircle className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Dúvidas frequentes</h2>
        </div>
        <div className="px-5">
          {faqs.map((faq, i) => (
            <FaqItem key={i} {...faq} />
          ))}
        </div>
      </div>

    </div>
  );
};

export default CardOrientacoes;

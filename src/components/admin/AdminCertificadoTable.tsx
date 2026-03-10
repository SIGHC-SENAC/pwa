import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import type { CertificadoAdmin } from "@/services/adminCertificadoService";
import { formatTimestamp } from "@/services/adminCertificadoService";
import { formatFileSize } from "@/services/certificadoService";

interface Props {
  certificados: CertificadoAdmin[];
  onViewDetails: (cert: CertificadoAdmin) => void;
}

const PAGE_SIZE = 10;

const statusBadge = (status: string) => {
  switch (status) {
    case "pendente":
      return <Badge className="bg-warning/15 text-status-pending border-warning/30 hover:bg-warning/20">Pendente</Badge>;
    case "aprovado":
      return <Badge className="bg-success/15 text-status-approved border-success/30 hover:bg-success/20">Aprovado</Badge>;
    case "rejeitado":
      return <Badge className="bg-destructive/15 text-status-rejected border-destructive/30 hover:bg-destructive/20">Rejeitado</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const AdminCertificadoTable: React.FC<Props> = ({ certificados, onViewDetails }) => {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(certificados.length / PAGE_SIZE);
  const paged = certificados.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  React.useEffect(() => { setPage(0); }, [certificados.length]);

  if (certificados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Eye className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">Nenhum certificado encontrado</h3>
        <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou aguarde novos envios.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Aluno</TableHead>
              <TableHead className="hidden md:table-cell">Arquivo</TableHead>
              <TableHead className="hidden sm:table-cell">Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Horas</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((cert) => (
              <TableRow key={cert.id} className="group">
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground text-sm">{cert.nomeAluno}</p>
                    <p className="text-xs text-muted-foreground">{cert.emailAluno}</p>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <p className="text-sm text-foreground truncate max-w-[200px]">{cert.nomeArquivo}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(cert.tamanhoBytes)}</p>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {formatTimestamp(cert.createdAt)}
                </TableCell>
                <TableCell>{statusBadge(cert.status)}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm font-medium">
                  {cert.horasAprovadas ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onViewDetails(cert)} title="Ver detalhes">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="Abrir PDF">
                      <a href={cert.downloadURL} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, certificados.length)} de {certificados.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCertificadoTable;

import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export interface FilterState {
  busca: string;
  status: string;
  ordenacao: string;
}

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const AdminFilters: React.FC<Props> = ({ filters, onChange }) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou arquivo..."
          value={filters.busca}
          onChange={(e) => onChange({ ...filters, busca: e.target.value })}
          className="pl-9"
        />
      </div>
      <Select value={filters.status} onValueChange={(v) => onChange({ ...filters, status: v })}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="pendente">Pendentes</SelectItem>
          <SelectItem value="aprovado">Aprovados</SelectItem>
          <SelectItem value="rejeitado">Rejeitados</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.ordenacao} onValueChange={(v) => onChange({ ...filters, ordenacao: v })}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recente">Mais recente</SelectItem>
          <SelectItem value="antigo">Mais antigo</SelectItem>
          <SelectItem value="nome-asc">Aluno A-Z</SelectItem>
          <SelectItem value="nome-desc">Aluno Z-A</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default AdminFilters;

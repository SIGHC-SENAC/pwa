import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { type CategoriaAtividade, type GrupoAtividade } from "@/services/cursoService";
import { type Curso, updateCurso } from "@/services/cursoService";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  curso: Curso;
  onSaved: () => void;
}

function cloneRegras(curso: Curso): GrupoAtividade[] {
  const regras = JSON.parse(JSON.stringify(curso.regrasAtividades ?? [])) as GrupoAtividade[];
  return regras.map((grupo) => ({
    ...grupo,
    atividades: grupo.atividades.map((atividade) => {
      const horasTexto = String(atividade.aproveitamentoMaximo || "").match(/\d+/)?.[0];
      const horasMaximas = Number.isInteger(atividade.horasMaximas)
        ? atividade.horasMaximas
        : Number(horasTexto || 0);
      return {
        ...atividade,
        horasMaximas,
        aproveitamentoMaximo: atividade.aproveitamentoMaximo || `${horasMaximas}h`,
      };
    }),
  }));
}

function nextCategoriaCode(grupos: GrupoAtividade[]) {
  const nums = grupos
    .flatMap((grupo) => grupo.atividades.map((atividade) => Number(String(atividade.id).split(".")[0])))
    .filter(Number.isFinite);
  return String((nums.length ? Math.max(...nums) : grupos.length) + 1);
}

function nextItemCode(grupo: GrupoAtividade) {
  const prefix = grupo.atividades[0]?.id?.split(".")[0] || grupo.id.replace(/\D/g, "") || "1";
  const nums = grupo.atividades
    .map((atividade) => Number(String(atividade.id).split(".")[1]))
    .filter(Number.isFinite);
  return `${prefix}.${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

const CourseRulesEditor: React.FC<Props> = ({ curso, onSaved }) => {
  const [grupos, setGrupos] = useState<GrupoAtividade[]>(() => cloneRegras(curso));
  const [saving, setSaving] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ grupoId: string; item: CategoriaAtividade } | null>(null);

  useEffect(() => {
    setGrupos(cloneRegras(curso));
  }, [curso]);

  const totalItens = useMemo(
    () => grupos.reduce((total, grupo) => total + grupo.atividades.length, 0),
    [grupos]
  );

  const updateGrupoLabel = (grupoId: string, label: string) => {
    setGrupos((current) => current.map((grupo) => grupo.id === grupoId ? { ...grupo, label } : grupo));
  };

  const addCategoria = () => {
    const label = novaCategoria.trim();
    if (!label) {
      toast.error("Informe o nome da categoria.");
      return;
    }

    const codigo = nextCategoriaCode(grupos);
    setGrupos((current) => [
      ...current,
      {
        id: `categoria-${codigo}`,
        label,
        tipo: label.toLowerCase(),
        atividades: [],
      },
    ]);
    setNovaCategoria("");
    setCategoryDialogOpen(false);
  };

  const removeCategoria = (grupoId: string) => {
    setGrupos((current) => current.filter((grupo) => grupo.id !== grupoId));
  };

  const addItem = (grupoId: string) => {
    setGrupos((current) => current.map((grupo) => {
      if (grupo.id !== grupoId) return grupo;
      const id = nextItemCode(grupo);
      const novoItem = {
        id,
        descricao: "",
        horasMaximas: 1,
        aproveitamentoMaximo: "1h",
        requisito: "",
        grupo: grupo.tipo || grupo.id,
      };
      setEditingItem({ grupoId, item: novoItem });
      return {
        ...grupo,
        atividades: [...grupo.atividades, novoItem],
      };
    }));
  };

  const removeItem = (grupoId: string, itemId: string) => {
    setGrupos((current) => current.map((grupo) => (
      grupo.id === grupoId
        ? { ...grupo, atividades: grupo.atividades.filter((atividade) => atividade.id !== itemId) }
        : grupo
    )));
    if (editingItem?.grupoId === grupoId && editingItem.item.id === itemId) {
      setEditingItem(null);
    }
  };

  const updateItem = (grupoId: string, itemId: string, field: "descricao" | "horasMaximas" | "requisito", value: string) => {
    const parsedHoras = Number(value);
    const horasMaximas = Number.isFinite(parsedHoras) ? Math.max(0, Math.trunc(parsedHoras)) : 0;
    const patch = field === "horasMaximas"
      ? {
          horasMaximas,
          aproveitamentoMaximo: `${horasMaximas}h`,
        }
      : { [field]: value };

    setEditingItem((current) =>
      current?.grupoId === grupoId && current.item.id === itemId
        ? { ...current, item: { ...current.item, ...patch } }
        : current
    );
    setGrupos((current) => current.map((grupo) => {
      if (grupo.id !== grupoId) return grupo;
      return {
        ...grupo,
        atividades: grupo.atividades.map((atividade) =>
          atividade.id === itemId ? { ...atividade, ...patch } : atividade
        ),
      };
    }));
  };

  const openItemEditor = (grupoId: string, item: CategoriaAtividade) => {
    setEditingItem({ grupoId, item: { ...item } });
  };

  const handleSave = async () => {
    if (!curso.id) return;
    const hasInvalid = grupos.some((grupo) =>
        !grupo.label.trim() ||
        grupo.atividades.some((atividade) =>
          !atividade.descricao.trim() ||
          !Number.isInteger(atividade.horasMaximas) ||
          atividade.horasMaximas <= 0 ||
          !atividade.requisito.trim()
        )
    );
    if (hasInvalid) {
      toast.error("Preencha categoria, atividade, horas maximas e comprovacao exigida.");
      return;
    }

    setSaving(true);
    try {
      await updateCurso(curso.id, { regrasAtividades: grupos });
      toast.success("Regras do curso atualizadas.");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar regras do curso.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-sm font-semibold text-foreground">{curso.nome}</p>
        <p className="text-xs text-muted-foreground">{grupos.length} categoria(s) - {totalItens} item(ns)</p>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {grupos.map((grupo) => (
          <AccordionItem key={grupo.id} value={grupo.id} className="rounded-lg border px-3">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <Badge variant="outline">{grupo.atividades[0]?.id?.split(".")[0] || grupo.id}</Badge>
                <span className="truncate">{grupo.label}</span>
                <Badge variant="secondary" className="ml-auto shrink-0">
                  {grupo.atividades.reduce((total, atividade) => total + (atividade.horasMaximas || 0), 0)}h
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input
                  value={grupo.label}
                  onChange={(event) => updateGrupoLabel(grupo.id, event.target.value)}
                  placeholder="Nome da categoria"
                />
                <Button type="button" variant="destructive" onClick={() => removeCategoria(grupo.id)} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Excluir categoria
                </Button>
              </div>

              <div className="divide-y rounded-md border bg-background">
                {grupo.atividades.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Nenhum item cadastrado nesta categoria.
                  </div>
                ) : grupo.atividades.map((atividade) => (
                  <div key={atividade.id} className="flex items-center gap-3 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => openItemEditor(grupo.id, atividade)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Badge variant="secondary" className="shrink-0">{atividade.id}</Badge>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {atividade.descricao || "Item sem descricao"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {atividade.horasMaximas || 0}h max. - {atividade.requisito || "Comprovacao nao informada"}
                        </p>
                      </div>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(grupo.id, atividade.id)}
                      className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button type="button" variant="outline" onClick={() => addItem(grupo.id)} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Adicionar item
              </Button>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="flex flex-col justify-end gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar categoria
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar regras
        </Button>
      </div>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nome da categoria</label>
            <Input
              value={novaCategoria}
              onChange={(event) => setNovaCategoria(event.target.value)}
              placeholder="Ex: Atividades de inovacao"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCategoria();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCategoryDialogOpen(false);
                setNovaCategoria("");
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={addCategoria} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar item da atividade</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">{editingItem.item.id}</Badge>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Atividade</label>
                <Textarea
                  value={editingItem.item.descricao}
                  onChange={(event) => updateItem(editingItem.grupoId, editingItem.item.id, "descricao", event.target.value)}
                  rows={4}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Horas maximas</label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={editingItem.item.horasMaximas || ""}
                    onChange={(event) => updateItem(editingItem.grupoId, editingItem.item.id, "horasMaximas", event.target.value)}
                    placeholder="Ex: 10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Comprovacao exigida</label>
                  <Input
                    value={editingItem.item.requisito}
                    onChange={(event) => updateItem(editingItem.grupoId, editingItem.item.id, "requisito", event.target.value)}
                    placeholder="Ex: Certificado"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {editingItem && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => removeItem(editingItem.grupoId, editingItem.item.id)}
                className="gap-2 sm:mr-auto"
              >
                <Trash2 className="h-4 w-4" />
                Excluir item
              </Button>
            )}
            <Button type="button" onClick={() => setEditingItem(null)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseRulesEditor;

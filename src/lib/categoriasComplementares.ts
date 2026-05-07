export interface CategoriaAtividade {
  id: string;
  descricao: string;
  horasMaximas: number;
  aproveitamentoMaximo: string;
  requisito: string;
  grupo: string;
}

export interface GrupoAtividade {
  id: string;
  label: string;
  tipo: string;
  atividades: CategoriaAtividade[];
}

export const GRUPOS_ATIVIDADES: GrupoAtividade[] = [
  {
    id: "ensino",
    label: "Atividades vinculadas ao ensino",
    tipo: "ensino",
    atividades: [
      {
        id: "1.1",
        descricao: "Participacao em monitoria no curso",
        horasMaximas: 20,
        aproveitamentoMaximo: "20h por semestre",
        requisito: "Declaracao da atividade",
        grupo: "ensino",
      },
      {
        id: "1.2",
        descricao: "Comparecimento a defesa de monografias, temas pertinentes",
        horasMaximas: 2,
        aproveitamentoMaximo: "2h por participacao",
        requisito: "Relatorio do evento e lista de presenca",
        grupo: "ensino",
      },
      {
        id: "1.3",
        descricao: "Disciplina cursada em outro curso da Faculdade Senac",
        horasMaximas: 20,
        aproveitamentoMaximo: "20h por disciplina",
        requisito: "Historico oficial",
        grupo: "ensino",
      },
      {
        id: "1.4",
        descricao: "Disciplina cursada fora da Faculdade Senac",
        horasMaximas: 20,
        aproveitamentoMaximo: "20h por disciplina",
        requisito: "Historico escolar e o programa da disciplina",
        grupo: "ensino",
      },
      {
        id: "1.5",
        descricao: "Cursos instrumentais - informatica e/ou lingua estrangeira",
        horasMaximas: 10,
        aproveitamentoMaximo: "10h por semestre",
        requisito: "Declaracao do curso e aprovacao no modulo ou semestre",
        grupo: "ensino",
      },
      {
        id: "1.6",
        descricao: "Certificacoes reconhecidas da area",
        horasMaximas: 10,
        aproveitamentoMaximo: "10h por semestre",
        requisito: "Declaracao de curso",
        grupo: "ensino",
      },
      {
        id: "1.7",
        descricao: "Elaboracao de material didatico supervisionado",
        horasMaximas: 5,
        aproveitamentoMaximo: "5h por material",
        requisito: "Copia do material",
        grupo: "ensino",
      },
      {
        id: "1.8",
        descricao: "Professor participante da formacao do aluno",
        horasMaximas: 10,
        aproveitamentoMaximo: "10h por participacao",
        requisito: "Certificado de Participacao",
        grupo: "ensino",
      },
      {
        id: "1.9",
        descricao: "Visitas tecnicas",
        horasMaximas: 4,
        aproveitamentoMaximo: "4h por visita",
        requisito: "Documento do orgao/empresa e/ou comprovante de presenca",
        grupo: "ensino",
      },
    ],
  },
  {
    id: "pesquisa",
    label: "Atividades vinculadas a pesquisa",
    tipo: "pesquisa",
    atividades: [
      {
        id: "2.1",
        descricao: "Participacao em pesquisa ou atividades de pesquisa",
        horasMaximas: 10,
        aproveitamentoMaximo: "10h por produto final publicado",
        requisito: "Relatorio do professor orientador",
        grupo: "pesquisa",
      },
      {
        id: "2.2",
        descricao: "Programa de bolsa de iniciacao cientifica",
        horasMaximas: 20,
        aproveitamentoMaximo: "20h por semestre",
        requisito: "Relatorio do professor orientador",
        grupo: "pesquisa",
      },
      {
        id: "2.3",
        descricao: "Publicacoes de artigos, em revistas, periodicos, sites e congeneres",
        horasMaximas: 10,
        aproveitamentoMaximo: "10h por produto publicado",
        requisito: "Publicacao",
        grupo: "pesquisa",
      },
      {
        id: "2.4",
        descricao: "Publicacao em livro na area",
        horasMaximas: 40,
        aproveitamentoMaximo: "40h por produto publicado",
        requisito: "Livro publicado",
        grupo: "pesquisa",
      },
      {
        id: "2.5",
        descricao: "Participacao em programa especial de treinamento",
        horasMaximas: 10,
        aproveitamentoMaximo: "10h por semestre",
        requisito: "Atestado ou certificado de participacao",
        grupo: "pesquisa",
      },
    ],
  },
  {
    id: "extensao",
    label: "Atividades vinculadas a extensao",
    tipo: "extensao",
    atividades: [
      {
        id: "3.1",
        descricao: "Participacao em seminarios, congressos, conferencias, encontros",
        horasMaximas: 10,
        aproveitamentoMaximo: "10h por participacao / 4h como publico",
        requisito: "Atestado ou certificado de participacao",
        grupo: "extensao",
      },
      {
        id: "3.2",
        descricao: "Atendimento comunitario de cunho social",
        horasMaximas: 10,
        aproveitamentoMaximo: "10h por semestre",
        requisito: "Atestado de participacao",
        grupo: "extensao",
      },
      {
        id: "3.3",
        descricao: "Apresentacao de trabalhos, concursos, exposicoes, paineis, mostras etc.",
        horasMaximas: 10,
        aproveitamentoMaximo: "10h pela apresentacao",
        requisito: "Trabalho apresentado",
        grupo: "extensao",
      },
      {
        id: "3.4",
        descricao: "Estagio extracurricular em entidades publicas ou privadas conveniadas com a Faculdade Senac",
        horasMaximas: 20,
        aproveitamentoMaximo: "20h por semestre",
        requisito: "Declaracao da instituicao apresentando relatorio de atividades",
        grupo: "extensao",
      },
      {
        id: "3.5",
        descricao: "Participacao em orgaos colegiados da Faculdade Senac",
        horasMaximas: 5,
        aproveitamentoMaximo: "5h por semestre",
        requisito: "Declaracao da Direcao ou Presidente dos Conselhos",
        grupo: "extensao",
      },
      {
        id: "3.6",
        descricao: "Representacao estudantil",
        horasMaximas: 10,
        aproveitamentoMaximo: "10h por semestre",
        requisito: "Declaracao da representacao estudantil",
        grupo: "extensao",
      },
      {
        id: "3.7",
        descricao: "Cursos de extensao universitaria dentro ou fora da Faculdade Senac",
        horasMaximas: 10,
        aproveitamentoMaximo: "10h por curso",
        requisito: "Declaracao da instituicao atestando carga horaria",
        grupo: "extensao",
      },
    ],
  },
];

export const TODAS_ATIVIDADES: CategoriaAtividade[] = GRUPOS_ATIVIDADES.flatMap(
  (grupo) => grupo.atividades
);

export function findAtividadeById(id: string): CategoriaAtividade | undefined {
  return TODAS_ATIVIDADES.find((atividade) => atividade.id === id);
}

export function findAtividadeInGrupos(grupos: GrupoAtividade[], id: string): CategoriaAtividade | undefined {
  return grupos.flatMap((grupo) => grupo.atividades).find((atividade) => atividade.id === id);
}

export function findGrupoById(id: string): GrupoAtividade | undefined {
  return GRUPOS_ATIVIDADES.find((grupo) => grupo.id === id);
}

export function findGrupoByAtividadeId(atividadeId: string): GrupoAtividade | undefined {
  return GRUPOS_ATIVIDADES.find((grupo) =>
    grupo.atividades.some((atividade) => atividade.id === atividadeId)
  );
}

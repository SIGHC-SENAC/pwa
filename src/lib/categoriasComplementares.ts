export interface CategoriaAtividade {
  id: string;
  descricao: string;
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
        descricao: "Participação em monitoria no curso",
        aproveitamentoMaximo: "20h por semestre",
        requisito: "Declaração e relatório das atividades",
        grupo: "ensino",
      },
      {
        id: "1.2",
        descricao: "Comparecimento a defesas de monografias - temas pertinentes",
        aproveitamentoMaximo: "2h por participação",
        requisito: "Relatório do evento e lista de presença",
        grupo: "ensino",
      },
      {
        id: "1.3",
        descricao: "Disciplina cursada em outros cursos da Faculdade Senac",
        aproveitamentoMaximo: "20h por disciplina",
        requisito: "Histórico oficial",
        grupo: "ensino",
      },
      {
        id: "1.4",
        descricao: "Disciplinas cursadas fora da Faculdade Senac",
        aproveitamentoMaximo: "20h por disciplina",
        requisito: "Histórico escolar e o programa da disciplina",
        grupo: "ensino",
      },
      {
        id: "1.5",
        descricao: "Cursos instrumentais - informática e/ou língua estrangeira",
        aproveitamentoMaximo: "10h por semestre",
        requisito: "Declaração do curso e aprovação no módulo ou semestre",
        grupo: "ensino",
      },
      {
        id: "1.6",
        descricao: "Certificações reconhecidas da área",
        aproveitamentoMaximo: "10h por semestre",
        requisito: "Declaração do curso",
        grupo: "ensino",
      },
      {
        id: "1.7",
        descricao: "Elaboração de material didático com supervisão do professor",
        aproveitamentoMaximo: "5h por material",
        requisito: "Cópia do material",
        grupo: "ensino",
      },
      {
        id: "1.8",
        descricao: "Atividade extraclasse promovida como parte da formação do aluno",
        aproveitamentoMaximo: "10h por participação",
        requisito: "Certificado de participação",
        grupo: "ensino",
      },
      {
        id: "1.9",
        descricao: "Visitas técnicas",
        aproveitamentoMaximo: "4h por visita",
        requisito: "Documento do órgão / empresa e/ou comprovante de presença",
        grupo: "ensino",
      },
    ],
  },
  {
    id: "pesquisa",
    label: "Atividades vinculadas à pesquisa",
    tipo: "pesquisa",
    atividades: [
      {
        id: "2.1",
        descricao: "Participação em pesquisas ou atividades de pesquisa",
        aproveitamentoMaximo: "10h por produto final publicado",
        requisito: "Relatório do professor orientador",
        grupo: "pesquisa",
      },
      {
        id: "2.2",
        descricao: "Programas de bolsa de iniciação científica",
        aproveitamentoMaximo: "20h por bolsa",
        requisito: "Relatório do professor orientador",
        grupo: "pesquisa",
      },
      {
        id: "2.3",
        descricao: "Publicações de artigos, em revistas, periódicos, sites e congêneres",
        aproveitamentoMaximo: "10h por produto publicado",
        requisito: "Publicação",
        grupo: "pesquisa",
      },
      {
        id: "2.4",
        descricao: "Publicação em livro na área",
        aproveitamentoMaximo: "40h por produto publicado",
        requisito: "Livro publicado",
        grupo: "pesquisa",
      },
      {
        id: "2.5",
        descricao: "Participação em programa especial de treinamento",
        aproveitamentoMaximo: "10h por semestre",
        requisito: "Atestado ou certificado de participação",
        grupo: "pesquisa",
      },
    ],
  },
  {
    id: "extensao",
    label: "Atividades vinculadas à extensão",
    tipo: "extensao",
    atividades: [
      {
        id: "3.1",
        descricao: "Participação em seminários, congressos, conferências, encontros",
        aproveitamentoMaximo: "10h por participação / 4h como público",
        requisito: "Atestado ou certificado de participação",
        grupo: "extensao",
      },
      {
        id: "3.2",
        descricao: "Atendimento comunitário de cunho social",
        aproveitamentoMaximo: "10h por semestre",
        requisito: "Atestado de participação",
        grupo: "extensao",
      },
      {
        id: "3.3",
        descricao: "Apresentação de trabalhos, concursos, exposições, painéis, mostras e congêneres",
        aproveitamentoMaximo: "10h pela apresentação",
        requisito: "Trabalho apresentado",
        grupo: "extensao",
      },
      {
        id: "3.4",
        descricao: "Estágio extracurricular em entidades públicas ou privadas conveniadas com a Faculdade Senac",
        aproveitamentoMaximo: "20h por semestre",
        requisito: "Declaração da instituição e apresentação de relatório de atividades",
        grupo: "extensao",
      },
      {
        id: "3.5",
        descricao: "Participação em órgãos colegiados da Faculdade Senac",
        aproveitamentoMaximo: "5h por semestre",
        requisito: "Declaração da Direção ou do Presidente dos Conselhos",
        grupo: "extensao",
      },
      {
        id: "3.6",
        descricao: "Representação estudantil",
        aproveitamentoMaximo: "10h por semestre",
        requisito: "Declaração da representação estudantil",
        grupo: "extensao",
      },
      {
        id: "3.7",
        descricao: "Cursos de extensão universitária, dentro ou fora da Faculdade Senac",
        aproveitamentoMaximo: "10h por curso",
        requisito: "Declaração da instituição atestando carga horária",
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

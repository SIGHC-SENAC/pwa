# Modelagem UML - Versao para Apresentacao ao Cliente

Este material mostra como o sistema funciona de forma simples, destacando:
- Quem usa o sistema
- O que cada perfil pode fazer
- Como as partes principais se relacionam
- Como acontece um fluxo importante na pratica

## 1) Casos de Uso (visao de negocio)

```mermaid
flowchart LR
  Aluno[Aluno]
  Admin[Coordenador/Admin]
  Super[Super Administrador]

  subgraph Sistema[Sistema de Horas Complementares]
    U1[Enviar certificado]
    U2[Acompanhar envio e validacao]
    U3[Receber aviso de novo certificado]
    U4[Gerenciar alunos]
    U5[Gerenciar coordenadores]
    U6[Gerenciar cursos]
    U7[Gerenciar turmas]
  end

  Aluno --> U1
  Aluno --> U2
  Admin --> U3
  Super --> U4
  Super --> U5
  Super --> U6
  Super --> U7
```

Leitura rapida:
- O aluno envia documentos e acompanha o andamento.
- O coordenador recebe alertas para analisar os envios.
- O super administrador organiza a estrutura academica (alunos, cursos, turmas e coordenadores).

## 2) Diagrama de Classes (estrutura principal)

```mermaid
classDiagram
  class Usuario {
    +nome
    +email
    +perfil
  }

  class Aluno {
    +enviarCertificado()
    +acompanharStatus()
  }

  class Coordenador {
    +receberNotificacao()
    +avaliarEnvio()
  }

  class SuperAdministrador {
    +gerenciarAlunos()
    +gerenciarCoordenadores()
    +gerenciarCursos()
    +gerenciarTurmas()
  }

  class Curso {
    +nome
    +codigo
    +cargaHorariaComplementar
  }

  class Turma {
    +nome
    +periodo
    +horario
  }

  class Certificado {
    +nomeArquivo
    +status
    +dataEnvio
  }

  Usuario <|-- Aluno
  Usuario <|-- Coordenador
  Coordenador <|-- SuperAdministrador
  Curso "1" --> "N" Turma
  Curso "1" --> "N" Aluno
  Aluno "1" --> "N" Certificado
```

Leitura rapida:
- Usuario e a base dos perfis do sistema.
- Aluno e Coordenador sao especializacoes com responsabilidades diferentes.
- Curso organiza turmas e alunos.
- Certificado representa os documentos enviados pelo aluno.

## 3) Diagrama de Sequencia (exemplo principal)

Cenario: envio e validacao de certificado.

```mermaid
sequenceDiagram
  actor Aluno
  participant Sistema
  participant Validador
  participant Banco as Base de Dados
  participant Coordenador

  Aluno->>Sistema: Envia certificado
  Sistema->>Validador: Verifica arquivo e seguranca

  alt Arquivo invalido
    Sistema->>Banco: Registra tentativa invalida
    Sistema-->>Aluno: Informa rejeicao do arquivo
  else Arquivo valido
    Sistema->>Banco: Salva certificado como pendente
    Sistema-->>Coordenador: Envia notificacao de novo envio
    Sistema-->>Aluno: Confirma envio com sucesso
  end
```

Leitura rapida:
- O aluno envia o documento.
- O sistema valida automaticamente.
- Se estiver correto, o envio segue para analise e o coordenador e avisado.

## Mensagem para apresentar ao cliente

- O sistema organiza todo o ciclo de horas complementares, do envio do documento ate a analise.
- O processo reduz trabalho manual com validacoes automaticas e notificacoes.
- A estrutura de perfis garante controle e seguranca das operacoes.

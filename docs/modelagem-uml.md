<style>
@page {
  size: A4 landscape;
  margin: 1cm;
}

body {
  font-family: Arial, sans-serif;
  font-size: 14px;
}

h1, h2, h3 {
  text-align: center;
}

.mermaid {
  width: 100%;
  transform: scale(0.85);
  transform-origin: top center;
}
</style>


# Modelagem UML — SIGHC

## Sistema de Gerenciamento de Horas Complementares | Faculdade Senac PE

Este documento apresenta 4 diagramas para a apresentação ao cliente:

1. Diagrama de Casos de Uso
2. Diagrama de Classes
3. Diagrama de Sequência
4. Diagrama de Arquitetura do Sistema

---

## 1) Diagrama de Casos de Uso

```mermaid
flowchart LR
    subgraph Atores
        Aluno([Aluno])
        Admin([Coordenador\nAdmin])
        SuperAdmin([SuperAdmin])
        Sistema([Sistema\nBackend])
    end

    subgraph UC_Comum ["Acesso ao Sistema"]
        UC_Login(Fazer Login)
        UC_Senha(Redefinir Senha)
        UC_PrimeiroAcesso(Primeiro Acesso\nobrigatório)
        UC_Notif(Receber Notificações\nPush / FCM)
    end

    subgraph UC_Aluno ["Área do Aluno — Horas Complementares"]
        UC_Upload(Enviar Certificado)
        UC_SelecionarCategoria(Selecionar Categoria\nde Atividade)
        UC_ValidarPDF(Validar PDF\nclient-side)
        UC_ProcessarSeg(Validação de Segurança\nno Backend)
        UC_Historico(Consultar Histórico\nde Certificados)
        UC_Progresso(Acompanhar Progresso\nde Horas)
        UC_Dashboard(Ver Dashboard\nPersonalizado)
    end

    subgraph UC_Admin ["Área do Coordenador — Admin"]
        UC_DashAdmin(Ver Dashboard\ne Gráficos)
        UC_ListarCerts(Listar Certificados\ncom Filtros)
        UC_VerPDF(Visualizar PDF\ndo Certificado)
        UC_Aprovar(Aprovar Certificado\ninformar horas)
        UC_Rejeitar(Rejeitar Certificado\ninformar motivo)
        UC_GerAlunos(Gerenciar Alunos)
        UC_GerTurmas(Gerenciar Turmas)
    end

    subgraph UC_SuperAdmin ["Área do SuperAdmin"]
        UC_DashSuper(Ver Dashboard\nGeral do Sistema)
        UC_GerCursos(Gerenciar Cursos\nCRUD)
        UC_GerTurmasS(Gerenciar Turmas\nCRUD)
        UC_GerAlunosS(Gerenciar Alunos\nCRUD)
        UC_GerAdmins(Gerenciar Coordenadores\nCRUD)
    end

    Aluno --> UC_Login
    Aluno --> UC_Senha
    Aluno --> UC_PrimeiroAcesso
    Aluno --> UC_Upload
    Aluno --> UC_Historico
    Aluno --> UC_Progresso
    Aluno --> UC_Dashboard
    Aluno --> UC_Notif

    Admin --> UC_Login
    Admin --> UC_DashAdmin
    Admin --> UC_ListarCerts
    Admin --> UC_GerAlunos
    Admin --> UC_GerTurmas
    Admin --> UC_Notif

    SuperAdmin --> UC_Login
    SuperAdmin --> UC_DashSuper
    SuperAdmin --> UC_GerCursos
    SuperAdmin --> UC_GerTurmasS
    SuperAdmin --> UC_GerAlunosS
    SuperAdmin --> UC_GerAdmins
    SuperAdmin --> UC_Notif

    UC_Upload -. "<<include>>" .-> UC_SelecionarCategoria
    UC_Upload -. "<<include>>" .-> UC_ValidarPDF
    UC_Upload -. "<<include>>" .-> UC_ProcessarSeg

    UC_ListarCerts -. "<<include>>" .-> UC_VerPDF
    UC_Aprovar -. "<<extend>>" .-> UC_ListarCerts
    UC_Rejeitar -. "<<extend>>" .-> UC_ListarCerts

    Sistema -. "valida segurança\ndo PDF" .-> UC_ProcessarSeg
    Sistema -. "envia push\nnotification" .-> UC_Notif
```

---

## 2) Diagrama de Classes

```mermaid
classDiagram
    class Usuario
    class Aluno
    class Admin
    class SuperAdmin
    class Curso
    class Turma
    class CategoriaAtividade
    class GrupoAtividade
    class CertificadoMeta
    class FcmNotification
    class CertificadoService
    class AdminService
    class CursoService
    class TurmaService
    class SuperAdminService
    class FcmService

    Usuario <|-- Aluno
    Usuario <|-- Admin
    Usuario <|-- SuperAdmin

    Curso "1" --> "*" Turma : contem
    Curso "1" --> "*" Aluno : agrupa
    Admin --> Curso : vinculado

    Aluno --> "*" CertificadoMeta : envia
    Admin --> "*" CertificadoMeta : analisa

    GrupoAtividade --> "*" CategoriaAtividade : agrupa
    CertificadoMeta --> CategoriaAtividade : classificado

    CertificadoMeta ..> CertificadoService : gerenciado
    Admin ..> AdminService : usa
    SuperAdmin ..> CursoService : usa
    SuperAdmin ..> TurmaService : usa
    SuperAdmin ..> SuperAdminService : usa
    Usuario ..> FcmService : notificacoes
```

---

## 3) Diagrama de Sequência

Cenário: **envio de certificado pelo aluno com validação de segurança e aprovação pelo coordenador**.

```mermaid
sequenceDiagram
    actor Aluno
    participant UI as UI HorasComplementares
    participant CertSvc as CertificadoService
    participant Storage as Firebase Storage
    participant API as Backend API
    participant Firestore as Firestore
    participant FCM as FCM / NotificacoesAPI
    actor Admin as Coordenador
    participant UIAdmin as UI Admin
    participant AdminSvc as AdminService

    Note over Aluno,UI: Aluno seleciona PDF, categoria e observação

    Aluno->>UI: Selecionar arquivo PDF + categoria
    UI->>CertSvc: validatePDF(file)
    alt Arquivo inválido (não PDF ou > 10MB)
        CertSvc-->>UI: erro de validação
        UI-->>Aluno: Exibir mensagem de erro
    else Arquivo válido
        CertSvc-->>UI: OK

        UI->>CertSvc: uploadCertificado(file, uid)
        CertSvc->>Storage: uploadBytesResumable(file)
        Storage-->>UI: progresso (%)
        Storage-->>CertSvc: upload concluído + storagePath

        UI->>API: POST /certificados/processar\n(uid, storagePath, nomeArquivo, categoriaId, token)
        Note over API: Análise de segurança:\nverifica conteúdo suspeito no PDF
        alt PDF com conteúdo suspeito
            API-->>UI: erro + lista de encontrados
            UI->>CertSvc: saveRejectedCertificado(uid, nome, motivo, encontrados)
            CertSvc->>Firestore: addDoc(status=rejeitado, analisadoPor=sistema)
            UI-->>Aluno: Exibir motivo da rejeição automática
        else PDF aprovado pela segurança
            API-->>UI: ok + finalPath

            UI->>CertSvc: saveCertificadoMeta(dados)
            CertSvc->>Firestore: addDoc(status=pendente, categoriaId, categoriaNome)
            Firestore-->>CertSvc: certId

            UI->>FCM: POST /notificacoes/upload-certificado\n(nomeAluno, nomeArquivo, token)
            FCM-->>Admin: Push notification "Novo certificado pendente"

            UI-->>Aluno: "Certificado enviado com sucesso!"
        end
    end

    Note over Admin,UIAdmin: Coordenador abre painel de revisão

    Admin->>UIAdmin: Abrir aba Certificados
    UIAdmin->>AdminSvc: fetchAllCertificados()
    AdminSvc->>Firestore: query certificados (orderBy createdAt desc)
    Firestore-->>AdminSvc: lista de certificados
    AdminSvc-->>UIAdmin: dados carregados

    Admin->>UIAdmin: Abrir CertificadoDetailModal + visualizar PDF
    UIAdmin-->>Admin: Exibir detalhes e PDF inline

    alt Admin aprova
        Admin->>UIAdmin: Informar horas aprovadas + observação
        UIAdmin->>AdminSvc: aprovarCertificado(certId, adminUid, adminNome, horas, obs)
        AdminSvc->>Firestore: updateDoc(status=aprovado, horasAprovadas, nomeAdmin, dataAnalise)
        Firestore-->>AdminSvc: atualizado
        UIAdmin-->>Admin: "Certificado aprovado!"
    else Admin rejeita
        Admin->>UIAdmin: Informar motivo da rejeição
        UIAdmin->>AdminSvc: rejeitarCertificado(certId, adminUid, adminNome, motivo, obs)
        AdminSvc->>Firestore: updateDoc(status=rejeitado, motivoRejeicao, nomeAdmin, dataAnalise)
        Firestore-->>AdminSvc: atualizado
        UIAdmin-->>Admin: "Certificado rejeitado!"
    end

    Note over Aluno,Firestore: Aluno recarrega a página e vê o status atualizado no histórico e no progresso de horas
```

---

## 4) Diagrama de Arquitetura do Sistema

```mermaid
flowchart TB
    subgraph Cliente ["Frontend — PWA (React + Vite + TypeScript)"]
        direction TB
        subgraph PagesAluno ["Páginas do Aluno"]
            P_HC[HorasComplementares\nDashboard / Histórico / Orientações]
        end
        subgraph PagesAdmin ["Páginas do Admin"]
            P_Admin[Admin\nDashboard / Certificados]
        end
        subgraph PagesSA ["Páginas do SuperAdmin"]
            P_SA[SuperAdmin\nCursos / Turmas / Alunos / Coordenadores]
        end
        subgraph PagesAuth ["Autenticação"]
            P_Login[Login]
            P_FP[ForgotPassword]
            P_FA[FirstAccess]
        end

        CTX[AuthContext\ngerencia sessão e role]
        SW[Service Worker\nnotificações background]
    end

    subgraph Firebase ["Firebase (Google Cloud)"]
        FB_Auth[Firebase Auth\nautenticação JWT]
        FB_Store[Firestore\nBanco de dados NoSQL]
        FB_Storage[Firebase Storage\narquivos PDF]
        FB_FCM[Firebase Cloud Messaging\nnotificações push]
    end

    subgraph Backend ["Backend API (REST — Node.js)"]
        BE_Certs[POST /certificados/processar\nvalidação de segurança do PDF]
        BE_Cursos[CRUD /cursos]
        BE_Turmas[CRUD /turmas]
        BE_Alunos[CRUD /alunos]
        BE_Admins[CRUD /admins]
        BE_Notif[POST /notificacoes/upload-certificado]
    end

    subgraph Firestore_Collections ["Coleções Firestore"]
        COL_Certs[(certificados_horas_complementares)]
        COL_Cursos[(cursos)]
        COL_Users[(users — fcmTokens)]
    end

    P_HC -->|upload PDF| FB_Storage
    P_HC -->|salva meta| COL_Certs
    P_HC -->|processarCertificado| BE_Certs
    P_HC -->|notifica upload| BE_Notif

    P_Admin -->|lê/atualiza certificados| COL_Certs
    P_Admin -->|aprovar / rejeitar| COL_Certs

    P_SA -->|CRUD via API| BE_Cursos
    P_SA -->|CRUD via API| BE_Turmas
    P_SA -->|CRUD via API| BE_Alunos
    P_SA -->|CRUD via API| BE_Admins

    P_Login --> FB_Auth
    P_FA --> FB_Auth
    P_FP --> FB_Auth

    CTX --> FB_Auth

    BE_Certs -->|move PDF para path final| FB_Storage
    BE_Notif -->|envia push via FCM| FB_FCM
    FB_FCM -->|notificação foreground/background| SW

    Backend -->|lê/escreve| COL_Cursos
    Backend -->|lê tokens FCM| COL_Users
```

---

## Resumo para Apresentação ao Cliente

| Diagrama | O que demonstra |
| --- | --- |
| **Casos de Uso** | Responsabilidades de cada perfil: Aluno, Coordenador (Admin) e SuperAdmin, incluindo o fluxo de validação automática de segurança. |
| **Classes** | Modelo de dados real do sistema com entidades, atributos e relacionamentos tal como implementados no código. |
| **Sequência** | Fluxo completo de ponta a ponta: o aluno envia o PDF, o backend valida a segurança, o coordenador analisa e aprova ou rejeita, e o aluno vê o resultado. |
| **Arquitetura** | Visão macro das camadas: PWA no frontend, Firebase (Auth, Firestore, Storage, FCM) como plataforma de dados e notificações, e API REST no backend. |

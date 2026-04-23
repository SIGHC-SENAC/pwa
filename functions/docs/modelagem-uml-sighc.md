# Modelagem UML - SIGHC (backend/functions)

Este documento consolida 3 diagramas UML do projeto:
1. Casos de Uso
2. Classes
3. Sequencia (cenario: processamento de certificado)

## 1) Diagrama de Casos de Uso

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "Usuario" as Usuario
actor "Aluno" as Aluno
actor "Admin" as Admin
actor "SuperAdmin" as SuperAdmin

Usuario <|-- Aluno
Usuario <|-- Admin
Admin <|-- SuperAdmin

rectangle "SIGHC" {
  usecase "Autenticar Usuario" as UC_Login

  usecase "Enviar Certificado" as UC_EnviarCert
  usecase "Processar Certificado" as UC_ProcessarCert
  usecase "Validar Tamanho do Arquivo" as UC_ValTam
  usecase "Validar Cabecalho PDF" as UC_ValCab
  usecase "Analisar Estruturas Suspeitas" as UC_ValSus
  usecase "Rejeitar Certificado" as UC_Rejeitar
  usecase "Registrar Certificado" as UC_Registrar

  usecase "Receber Notificacao de Upload" as UC_Notif
  usecase "Notificar Admins" as UC_NotifAdmins

  usecase "Gerenciar Alunos" as UC_GerAlunos
  usecase "Cadastrar Aluno" as UC_CriarAluno
  usecase "Listar Alunos" as UC_ListAlunos

  usecase "Gerenciar Admins" as UC_GerAdmins
  usecase "Cadastrar Admin" as UC_CriarAdmin
  usecase "Atualizar Admin" as UC_UpdAdmin
  usecase "Excluir Admin" as UC_DelAdmin

  usecase "Gerenciar Cursos" as UC_GerCursos
  usecase "Gerenciar Turmas" as UC_GerTurmas
  usecase "Definir Role de Usuario" as UC_Role

  usecase "Validar Curso" as UC_ValCurso
  usecase "Validar Turma" as UC_ValTurma
  usecase "Enviar Credenciais por E-mail" as UC_Email
}

Usuario --> UC_Login
Aluno --> UC_EnviarCert
Admin --> UC_Notif
SuperAdmin --> UC_GerAlunos
SuperAdmin --> UC_GerAdmins
SuperAdmin --> UC_GerCursos
SuperAdmin --> UC_GerTurmas
SuperAdmin --> UC_Role

UC_EnviarCert .> UC_ProcessarCert : <<include>>
UC_ProcessarCert .> UC_ValTam : <<include>>
UC_ProcessarCert .> UC_ValCab : <<include>>
UC_ProcessarCert .> UC_ValSus : <<include>>
UC_Rejeitar .> UC_ProcessarCert : <<extend>>
UC_Registrar .> UC_ProcessarCert : <<extend>>

UC_Notif .> UC_NotifAdmins : <<include>>

UC_GerAlunos .> UC_CriarAluno : <<include>>
UC_GerAlunos .> UC_ListAlunos : <<include>>
UC_CriarAluno .> UC_ValCurso : <<include>>
UC_CriarAluno .> UC_ValTurma : <<extend>>
UC_CriarAluno .> UC_Email : <<include>>

UC_GerAdmins .> UC_CriarAdmin : <<include>>
UC_GerAdmins .> UC_UpdAdmin : <<include>>
UC_GerAdmins .> UC_DelAdmin : <<include>>
UC_CriarAdmin .> UC_ValCurso : <<include>>
UC_CriarAdmin .> UC_Email : <<include>>

@enduml
```

## 2) Diagrama de Classes

```plantuml
@startuml
skinparam classAttributeIconSize 0

abstract class Usuario {
  #uid: String
  #nome: String
  #email: String
  #role: String
  +autenticar(): boolean
}

class Aluno {
  -cursoId: String
  -turmaId: String
  +enviarCertificado(storagePath: String, nomeArquivo: String): void
}

class Admin {
  -cursoId: String
  -fcmTokens: List<String>
  +receberNotificacao(): void
}

class SuperAdmin {
  +gerenciarAdmins(): void
  +gerenciarCursos(): void
  +gerenciarTurmas(): void
  +gerenciarAlunos(): void
}

class Curso {
  -id: String
  -nome: String
  -codigo: String
  -turno: String
  -cargaHorariaComplementar: Number
  -coordenadorId: String
  +criar(): void
  +atualizar(): void
  +deletar(): void
}

class Turma {
  -id: String
  -nome: String
  -horario: String
  -periodoInicio: String
  -periodoFinal: String
  -cursoId: String
  +criar(): void
  +atualizar(): void
  +deletar(): void
}

class Certificado {
  -id: String
  -uid: String
  -nomeArquivo: String
  -storagePath: String
  -status: String
  -analiseSeguranca: String
  -createdAt: Number
  -updatedAt: Number
  +processar(): void
}

class UploadSuspeito {
  -id: String
  -uid: String
  -nomeArquivo: String
  -storagePath: String
  -motivo: String
  -createdAt: Number
  +registrar(): void
}

class AuthMiddleware {
  +requireAuth(req, res, next): void
  +requireRole(allowedRoles): Function
}

class PDFScannerService {
  +validarTamanho(filePath: String): boolean
  +validarCabecalhoPdf(filePath: String): boolean
  +analisarPdfSuspeito(filePath: String): Analise
}

class NotificacaoService {
  +notificarAdminsUpload(nomeAluno: String, nomeArquivo: String): Resultado
}

Usuario <|-- Aluno
Usuario <|-- Admin
Admin <|-- SuperAdmin

Curso *-- "0..*" Turma
Curso o-- "0..1" Admin : coordenador
Curso -- "0..*" Aluno
Turma -- "0..*" Aluno
Aluno -- "0..*" Certificado

Certificado ..> PDFScannerService : usa
NotificacaoService ..> Admin : envia push
AuthMiddleware ..> Usuario : valida acesso
Certificado --> UploadSuspeito : gera em caso de risco

@enduml
```

## 3) Diagrama de Sequencia

Cenario escolhido: processamento de certificado (endpoint `POST /certificados/processar`).

```plantuml
@startuml
actor Aluno
participant Frontend
participant "CertificadosRouter" as Router
participant "CertificadosController" as Controller
participant "Firebase Storage" as Storage
participant "PDFScannerService" as Scanner
database "Firestore" as DB

Aluno -> Frontend: Envia arquivo PDF
Frontend -> Storage: Upload em certificados_temp/
Storage --> Frontend: storagePath

Frontend -> Router: POST /certificados/processar\n(uid, storagePath, nomeArquivo)
Router -> Controller: processarCertificado(req, res)

Controller -> Storage: download(storagePath)
Storage --> Controller: arquivo temporario

Controller -> Scanner: validarTamanho(tempFilePath)
Scanner --> Controller: tamanhoOk?

alt Arquivo acima do limite
  Controller -> Storage: delete(storagePath)
  Controller -> DB: add uploads_suspeitos(motivo=tamanho)
  Controller --> Frontend: 400 Arquivo acima do limite
else Tamanho valido
  Controller -> Scanner: validarCabecalhoPdf(tempFilePath)
  Scanner --> Controller: cabecalhoOk?

  alt Cabecalho invalido
    Controller -> Storage: delete(storagePath)
    Controller -> DB: add uploads_suspeitos(motivo=cabecalho)
    Controller --> Frontend: 400 Arquivo invalido
  else Cabecalho valido
    Controller -> Scanner: analisarPdfSuspeito(tempFilePath)
    Scanner --> Controller: suspeito?, encontrados

    alt Estruturas suspeitas detectadas
      Controller -> Storage: delete(storagePath)
      Controller -> DB: add uploads_suspeitos(motivo=assinaturas)
      Controller --> Frontend: 400 PDF rejeitado por seguranca
    else PDF aprovado
      Controller -> Storage: move(certificados_temp -> certificados)
      Controller -> DB: add certificados_horas_complementares(status=pendente)
      Controller --> Frontend: 200 ok + finalPath
    end
  end
end

@enduml
```

## Observacoes rapidas

- Os casos de uso foram derivados das rotas e controllers atuais.
- O diagrama de classes combina classes de dominio (Usuario, Curso, Turma, Certificado) com classes de servico/infraestrutura usadas no backend.
- O diagrama de sequencia segue exatamente o fluxo principal de `processarCertificado`.

# Portal Developer SIGHC

Portal técnico do **SIGHC** para consulta da documentação operacional das rotas HTTP das Firebase Functions.

A aplicação entrega uma tela protegida para contas com perfil `superAdmin`, com catálogo pesquisável de endpoints, exemplos de requisição, exemplos de resposta, geração de cURL e acesso rápido à coleção do Postman.

## O Que o Portal Entrega

- Login restrito a usuários `superAdmin`.
- Validação de perfil pelo Firebase Auth e Firestore.
- Catálogo visual das rotas da API SIGHC.
- Agrupamento das rotas por domínio: `status`, `auth`, `admins`, `alunos`, `cursos`, `turmas`, `certificados` e `notificacoes`.
- Busca por rota, método ou descrição.
- Filtro por público/perfil: `superAdmin`, `admin`, `aluno` e `publico`.
- Accordion animado em cada rota para abrir e fechar detalhes.
- Indicação visual por método HTTP: `GET`, `POST`, `PUT` e `DELETE`.
- Exemplos de body e resposta quando disponíveis.
- cURL gerado automaticamente com a base da API configurada.
- Botão para copiar cURL para a área de transferência.
- Link direto para a API base.
- Link direto para a coleção Postman.
- Logout do portal.

## Acesso

O portal é exclusivo para contas com perfil `superAdmin`.

Ao fazer login, a aplicação tenta identificar o perfil por:

1. Custom claim `role` no Firebase Auth.
2. Documento correspondente em `users/{uid}` no Firestore, caso a claim não exista.

Se o perfil detectado não for `superAdmin`, o usuário é desconectado e o acesso é bloqueado.

## Rotas Documentadas

O catálogo exibido na tela documenta endpoints como:

| Grupo | Rotas |
| --- | --- |
| `status` | `GET /` |
| `auth` | `POST /auth/login/super-admin`, `POST /auth/login/admin`, `POST /auth/login/aluno` |
| `admins` | `GET /admins`, `POST /admins`, `PUT /admins/:id`, `DELETE /admins/:id` |
| `alunos` | `GET /alunos`, `POST /alunos`, `PUT /alunos/:id`, `DELETE /alunos/:id` |
| `cursos` | `GET /cursos`, `GET /cursos/:id`, `POST /cursos`, `PUT /cursos/:id`, `DELETE /cursos/:id` |
| `turmas` | `GET /turmas`, `GET /turmas/:id`, `POST /turmas`, `PUT /turmas/:id`, `DELETE /turmas/:id` |
| `certificados` | `POST /certificados/processar` |
| `notificacoes` | `POST /notificacoes/upload-certificado` |

Rotas protegidas usam o cabeçalho:

```http
Authorization: Bearer $FIREBASE_ID_TOKEN
```

## Postman

A coleção Postman também está disponível pela própria tela do portal, no botão **Postman** do cabeçalho.

Link direto:

https://web.postman.co/workspace/My-Workspace~bcfd2e47-7726-4914-8323-35559fa0d32d/collection/31258510-fda771e8-2196-496c-847f-5d7478e4fe9b?action=share&source=copy-link&creator=31258510

## Configuração

A base da API pode ser configurada por variável de ambiente:

```env
VITE_API_BASE_URL=https://api.sighc.com.br
```

Se a variável não for definida, o portal usa:

```text
https://api.sighc.com.br
```

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui, lucide-react |
| Autenticação | Firebase Auth |
| Banco de apoio | Firestore |
| Estado servidor | TanStack React Query |
| Notificações de UI | Sonner e shadcn/ui Toast |
| Deploy | Firebase Hosting |

## Estrutura Principal

```text
src/
├── App.tsx                    # Rotas do portal developer
├── pages/
│   └── DeveloperPortal.tsx    # Tela de login e documentação da API
├── contexts/
│   └── AuthContext.tsx        # Estado de autenticação e perfil do usuário
├── lib/
│   └── firebase.ts            # Configuração Firebase
└── components/
    └── ui/                    # Componentes shadcn/ui
```

## Como Executar

Instale as dependências:

```bash
npm install
```

Rode em desenvolvimento:

```bash
npm run dev
```

Gere o build de produção:

```bash
npm run build
```

Visualize o build localmente:

```bash
npm run preview
```

## Qualidade

Execute lint:

```bash
npm run lint
```

Execute testes:

```bash
npm run test
```

## Deploy

O deploy está configurado para Firebase Hosting:

```bash
npm run deploy
```

Esse comando executa o build e depois publica com `firebase deploy`.

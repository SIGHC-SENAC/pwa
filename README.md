# Horas Complementares - SENAC

Sistema web para envio e gestão de certificados de horas complementares dos alunos do SENAC.

## Sobre o Projeto

Plataforma que permite aos **alunos** enviarem certificados de atividades complementares e acompanharem o status de aprovação, e aos **administradores** gerenciarem cursos, alunos e validarem os certificados enviados.

### Funcionalidades

**Aluno:**
- Upload de certificados (PDF) com observações
- Acompanhamento do status (pendente, aprovado, rejeitado)
- Barra de progresso de horas complementares
- Notificações push (FCM)
- PWA — instalável no celular

**Administrador:**
- Cadastro e gestão de cursos (nome, código, turno, carga horária)
- Cadastro de alunos vinculados a cursos
- Aprovação/rejeição de certificados com atribuição de horas

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 · TypeScript · Vite |
| Estilização | Tailwind CSS · shadcn/ui |
| Backend / BaaS | Firebase (Auth, Firestore, Storage, Cloud Functions) |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| PWA | vite-plugin-pwa |
| Roteamento | React Router v6 |
| Estado servidor | TanStack React Query |
| Formulários | React Hook Form · Zod |

## Estrutura de Pastas

```
src/
├── components/       # Componentes reutilizáveis (UI + domínio)
├── contexts/         # AuthContext (autenticação global)
├── hooks/            # Hooks customizados
├── lib/              # Firebase config, utilitários
├── pages/            # Páginas (Login, Admin, HorasComplementares, etc.)
└── services/         # Serviços de API (cursos, certificados, admin, FCM)
```


## Como Executar

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build e deply de produção
npm run deploy
```

## Deploy

O projeto está configurado para deploy via **Firebase Hosting**. 
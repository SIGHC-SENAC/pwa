# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server on port 8080
npm run build      # production build
npm run deploy     # build + firebase deploy
npm run lint       # ESLint
npm run test       # vitest (single run)
npm run test:watch # vitest (watch mode)
```

Firebase credentials must be set in `.env` (or `.env.local`) with `VITE_FIREBASE_*` prefix — see `src/lib/firebase.ts` for the required keys.

## Architecture

### Roles & routing

There are three user roles — `aluno`, `admin`, `superAdmin` — stored in Firestore under `users/{uid}` and mirrored as Firebase Auth custom claims. `AuthContext` (`src/contexts/AuthContext.tsx`) reads both sources on login and exposes `isAluno` / `isSuperAdmin` booleans. Each role lands on a dedicated page:

| Role | Page |
|------|------|
| aluno | `/` → `HorasComplementares` |
| admin | `/admin` → `Admin` |
| superAdmin | `/super-admin` → `SuperAdmin` |

### Data layer

All Firestore and Storage calls are isolated in `src/services/`:

- `certificadoService.ts` — upload (max 10 MB, collection `certificados_horas_complementares`) and queries
- `adminService.ts` — approve/reject certificates, manage students
- `cursoService.ts` / `turmaService.ts` / `superAdminService.ts` — course/class/admin management
- `fcmService.ts` — Firebase Cloud Messaging push token registration

Components never call Firebase directly; they go through these services or via React Query hooks.

### State management

React Query (`@tanstack/react-query`) handles all async server state. There is no global client-side state store — shared auth state comes from `useAuth()`.

### Alias

`@/` resolves to `src/` (configured in `vite.config.ts` and `tsconfig`).

### AI features

- `FloatingChatButton` — Gemini-powered chat assistant floating on every page
- `PdfViewerModal` — OCR via Vision API for reading certificate content

# TaskPilot Frontend

React + Vite + TypeScript frontend for TaskPilot.

TaskPilot is the current product name shown in the browser title, login page, sidebar brand, demo content, and frontend-facing documentation. The repository and some backend configuration may still use the historical project name `AI-agent-TODO`.

Full frontend implementation notes are maintained in `../doc/前端实现文档.md`.

## Scripts

```bash
npm install
npm run dev
npm run build
```

Development API base URL is configured in `.env.development`:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

When `VITE_API_BASE_URL` already includes `/api`, frontend API modules should call paths such as `/tasks` and `/auth/login`.

## Current Frontend Content

- Product name: `TaskPilot`
- App shell: left sidebar, top toolbar, routed workspace pages, and mobile bottom navigation.
- Entry page: immersive login/register cover, backend login/register form, and demo-account entry.
- Workspace pages: dashboard, task center, calendar, settings, and AI workspace.
- Persistent assistant: floating AI chat panel in the lower-right corner.
- Visual assets: `public/background.png` for the auth cover and `public/kuang.png` for the cover badge frame.

## Naming Notes

- Use `TaskPilot` for user-facing UI text and frontend docs.
- Keep `AI-agent-TODO` only when referring to the repository, legacy storage keys, or backend application metadata.
- Demo/local fallback profile email should use `demo@taskpilot.dev`.

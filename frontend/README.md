# AI-agent-TODO Frontend

React + Vite + TypeScript frontend for the AI-agent-TODO MVP.

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

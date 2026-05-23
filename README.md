# Tokans — Auth & Onboarding (TypeScript)

Full signup / signin / onboarding system built for Vercel Hobby (free tier).

**Stack:** React + Vite + TypeScript (frontend) · Vercel Serverless Functions (API) · Neon PostgreSQL (persistent data) · Vercel KV / Upstash Redis (sessions)

---

## Project structure

```
tokans/website/
├── api/
│   ├── auth/
│   │   ├── signup.ts            # POST — email/password signup
│   │   ├── signin.ts            # POST — email/password signin
│   │   ├── logout.ts            # POST — clear session
│   │   ├── session.ts           # GET  — check current session
│   │   ├── github.ts            # GET  — GitHub OAuth redirect
│   │   ├── github-callback.ts   # GET  — GitHub OAuth callback
│   │   ├── google.ts            # GET  — Google OAuth redirect
│   │   └── google-callback.ts   # GET  — Google OAuth callback
│   └── onboarding/
│       └── complete.ts          # POST — save role + context, refresh session
├── lib/
│   ├── types.ts                 # Shared domain types (roles, DB rows, API shapes)
│   ├── db.ts                    # Neon SQL client singleton
│   └── session.ts               # Vercel KV session helpers
├── src/
│   ├── App.tsx                  # Root — auth state, typed routing
│   ├── api.ts                   # Typed fetch wrapper
│   ├── index.css                # Design tokens + reset
│   ├── main.tsx                 # React entry point
│   ├── components/
│   │   └── ui.tsx               # Shared typed primitives
│   ├── data/
│   │   └── roles.ts             # Role definitions, subtype data
│   └── screens/
│       ├── AuthScreen.tsx       # Signup / signin (email + GitHub + Google)
│       ├── Onboarding.tsx       # Step orchestrator
│       ├── OnboardingSteps.tsx  # RoleStep, SubTypeStep, ContextStep, BarrierStep
│       └── Dashboard.tsx        # Post-login "coming soon" screen
├── index.html
├── schema.sql                   # Run once in Neon SQL editor
├── tsconfig.json
├── vercel.json
├── vite.config.ts
├── package.json
└── .env.example
```

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Type check

```bash
npm run typecheck
```

### 3. Create a Neon database

1. Go to [console.neon.tech](https://console.neon.tech) → New project
2. Copy the connection string
3. Open the SQL editor and run the contents of `schema.sql`

### 4. Create a Vercel KV store

1. Go to [vercel.com](https://vercel.com) → your project → Storage → Create KV database
2. Link it to your project — Vercel auto-injects `KV_*` env vars on deployment
3. For local dev, copy the variables from the KV dashboard into `.env.local`

### 5. Create GitHub OAuth app

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Homepage URL: `https://tokans.org`
3. Callback URL: `https://tokans.org/api/auth/github-callback`
4. Copy Client ID and Client Secret

### 6. Create Google OAuth credentials

1. [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Authorised redirect URI: `https://tokans.org/api/auth/google-callback`
4. Copy Client ID and Client Secret

### 7. Set environment variables

```bash
cp .env.example .env.local
# Fill in all values
```

Add the same variables in Vercel → Project Settings → Environment Variables.

### 8. Run locally

```bash
npm run dev   # runs `vercel dev` — starts Vite + serverless API routes together
```

> **Important:** Use `vercel dev`, not `vite`. Install the Vercel CLI first:
> `npm i -g vercel && vercel login`

### 9. Deploy

```bash
vercel --prod
```

---

## TypeScript notes

- `lib/types.ts` is the single source of truth for all domain types — imported by both API routes and frontend
- All API route handlers are typed with `VercelRequest` / `VercelResponse` from `@vercel/node`
- DB query results are typed with `Pick<DbUser, ...>[]` generics on neon's tagged template literal
- `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are enabled — be explicit with optional/indexed access
- Frontend uses `void` prefix for floating async calls in JSX event handlers to satisfy `@typescript-eslint/no-floating-promises`

---

## Vercel Hobby limits (free tier)

| Resource                     | Limit                          | Our usage                         |
| ---------------------------- | ------------------------------ | --------------------------------- |
| Serverless function duration | 10s max                        | Set in vercel.json — well within |
| KV storage                   | 256 MB                         | Sessions only — tiny footprint   |
| Neon free tier               | 0.5 GB storage, 1 compute unit | Sufficient for early users        |
| Bandwidth                    | 100 GB / month                 | Fine for MVP                      |

---

## Auth flows

### Email / password

`POST /api/auth/signup` → bcrypt hash → insert user → Redis session → `Set-Cookie`

`POST /api/auth/signin` → bcrypt compare → Redis session → `Set-Cookie`

### GitHub OAuth

Browser → `GET /api/auth/github` → GitHub consent → `GET /api/auth/github-callback?code=` → exchange code → fetch profile + emails → upsert user → create session → redirect to `/?oauth=success`

### Google OAuth

Same pattern via `GET /api/auth/google` → `GET /api/auth/google-callback`

### Account linking

If a GitHub/Google email already exists in `users`, the OAuth ID is linked to the existing account — no duplicate users.

### Session

7-day TTL in Redis. Refreshed (new session ID) after onboarding completes. `HttpOnly; Secure; SameSite=Lax` cookie.

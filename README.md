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

## Production deployment (Vercel)

End-to-end runbook for deploying `tokans/website` to `https://tokans.org` on Vercel Hobby with Neon Postgres + Upstash Redis. Assumes you already have a GitHub repo containing this folder.

### 1. Provision Neon Postgres (production branch)

1. Sign in at [console.neon.tech](https://console.neon.tech) and create a **new project**.
   - Region: pick the same region you'll deploy Vercel functions to (e.g. `aws-ap-southeast-1` if your Vercel project lives in Singapore). Cross-region adds 100–200ms to every query.
   - Postgres version: 16+.
2. The default `main` branch is your production database. Optionally create a `dev` branch for previews — Neon branches are copy-on-write and free on the Hobby plan.
3. On the project dashboard click **Connection string** → choose the **Pooled** connection (uses port `6432`, required for serverless functions). Toggle **`?sslmode=require`** on. It will look like:
   ```
   postgresql://<user>:<password>@<host>-pooler.<region>.aws.neon.tech/neondb?sslmode=require
   ```
4. Initialise the schema. Either:
   - Open **SQL Editor** in the Neon console, paste the contents of [schema.sql](schema.sql), run it; **or**
   - From your machine: `psql "$DATABASE_URL" -f schema.sql`
5. Verify by running `\dt` in the SQL editor — you should see `users`, `user_roles`, `onboarding_data`, `activities`, `tokan_entries`, `reviews`, `employer_briefs`, `matches`.
6. **Save the pooled connection string** — you'll paste it into Vercel as `DATABASE_URL`.

> Why pooled? Vercel Serverless Functions spin up many short-lived connections. The pooled endpoint multiplexes them via PgBouncer so you don't exhaust Neon's connection limit.

### 2. Provision Upstash Redis (sessions)

You have two equivalent options — both end up as Upstash Redis under the hood. Pick one:

**Option A — Vercel Marketplace (recommended, auto-injects env vars):**
1. Vercel Dashboard → your project (create it first via step 4 below if needed) → **Storage** tab → **Create Database** → **Upstash Redis (KV)**.
2. Name it `tokans-sessions`, choose the region nearest your function region, plan: **Free**.
3. Click **Connect Project** — Vercel will auto-inject these env vars on every deployment:
   - `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`
   - `REDIS_URL`
   - The code in [api/lib/redis.ts](api/lib/redis.ts) picks these up automatically.

**Option B — Upstash directly:**
1. Sign in at [console.upstash.com](https://console.upstash.com) → **Create Database** → Redis.
2. Type: **Regional** (cheaper, lower latency than Global for single-region apps). Region: match Vercel.
3. Enable **TLS**, eviction: `noeviction` (sessions should not be evicted).
4. From the database page copy:
   - **UPSTASH_REDIS_REST_URL** (looks like `https://<name>.upstash.io`)
   - **UPSTASH_REDIS_REST_TOKEN**
5. You'll paste these into Vercel env vars as `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

> Sessions are stored under `session:<uuid>` keys with a 7-day TTL (see [api/lib/session.ts](api/lib/session.ts)). The free tier's 256 MB / 10 k requests-per-day is plenty for early traffic.

### 3. Production OAuth credentials

OAuth apps are **environment-specific** — never reuse localhost credentials in production. Create dedicated production apps:

**GitHub (production app):**
1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
2. Application name: `Tokans` · Homepage URL: `https://tokans.org`
3. Authorization callback URL: `https://tokans.org/api/auth/github-callback`
4. After creation, click **Generate a new client secret**. Copy both the **Client ID** and **Client Secret** — the secret is shown once.

**Google (production credentials):**
1. [console.cloud.google.com](https://console.cloud.google.com) → create/select a project → **APIs & Services → OAuth consent screen**.
2. User type: **External** · App name: `Tokans` · Support email: yours · Authorised domains: `tokans.org`.
3. Submit for verification if you'll request sensitive scopes (this app only uses `openid email profile`, so verification is not required to launch).
4. **Credentials → Create credentials → OAuth client ID → Web application**.
5. Authorised JavaScript origins: `https://tokans.org`
6. Authorised redirect URIs: `https://tokans.org/api/auth/google-callback`
7. Copy the **Client ID** and **Client Secret**.

### 4. Create the Vercel project

1. Install + login to the CLI once: `npm i -g vercel && vercel login`.
2. From `tokans/website/`:
   ```bash
   vercel link              # connect this folder to a new or existing project
   ```
   - Scope: your team or personal account.
   - Link to existing project? **N** the first time.
   - Project name: `tokans` (or whatever you used).
   - Root directory: `./` (you're already inside `website/`).
   - Override settings? **N** — `vercel.json` covers it.
3. Or import the GitHub repo via the Vercel dashboard → **Add New → Project** → pick the repo → **Root Directory: `website`** → leave framework as **Vite**.

### 5. Configure environment variables in Vercel

Dashboard → **Project → Settings → Environment Variables**. Add each of the following and tick **Production** (and **Preview** if you want preview deployments to work — they'll need their own OAuth callback URLs whitelisted, see notes below).

| Variable | Value | Source |
|---|---|---|
| `DATABASE_URL` | Neon **pooled** connection string from step 1.3 | Neon dashboard |
| `UPSTASH_REDIS_REST_URL` | only if you used Upstash directly (Option B) | Upstash dashboard |
| `UPSTASH_REDIS_REST_TOKEN` | only if you used Upstash directly (Option B) | Upstash dashboard |
| `GITHUB_CLIENT_ID` | from step 3 | GitHub OAuth app |
| `GITHUB_CLIENT_SECRET` | from step 3 — mark as **Sensitive** | GitHub OAuth app |
| `GOOGLE_CLIENT_ID` | from step 3 | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | from step 3 — mark as **Sensitive** | Google Cloud Console |
| `APP_URL` | `https://tokans.org` | — |

If you chose **Option A** for Redis (Vercel Marketplace), do **not** add `UPSTASH_*` or `KV_*` vars manually — Vercel injects them automatically when the store is linked to the project.

CLI alternative (one-shot):
```bash
vercel env add DATABASE_URL production
vercel env add GITHUB_CLIENT_ID production
# ... repeat per var
```

### 6. Connect the custom domain

1. Dashboard → **Project → Settings → Domains → Add** → enter `tokans.org` and `www.tokans.org`.
2. Vercel will print the required DNS records. At your registrar (Namecheap, Cloudflare, etc.) add:
   - **Apex (`tokans.org`)** → `A` record to `76.76.21.21` (Vercel's anycast IP)
   - **`www`** → `CNAME` to `cname.vercel-dns.com`
3. Wait for DNS to propagate (usually < 5 min). Vercel auto-issues a Let's Encrypt cert once it sees the records.
4. Set `tokans.org` as **Production Domain** (the apex, not `www`) so OAuth callbacks resolve consistently.

### 7. First production deploy

```bash
vercel --prod
```

Or push to the `main` branch if you connected the GitHub integration in step 4 — Vercel deploys automatically.

The build runs `vite build` (per `vercel.json`'s `framework: vite`). Serverless functions in `api/**/*.ts` are bundled individually with a 10s `maxDuration`.

### 8. Post-deploy verification

Run through these in order — each builds on the previous:

```bash
# 1. Static site loads
curl -I https://tokans.org/                    # → HTTP/2 200

# 2. Session endpoint reachable (returns 200 + null payload when unauthenticated)
curl https://tokans.org/api/auth/session       # → {"user":null} or similar

# 3. Postgres connectivity — sign up a test user via the UI, then in Neon SQL editor:
#    SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 5;

# 4. Redis connectivity — after signin, in Upstash CLI / data browser:
#    KEYS session:*    (should show at least one key)
#    TTL session:<id>  (should be < 604800)

# 5. OAuth — click "Continue with GitHub" / "Continue with Google", confirm
#    redirect back to https://tokans.org/?oauth=success and user row appears
#    in `users` table with github_id / google_id populated.
```

If signup succeeds but signin doesn't persist, the session cookie is being blocked — check that `APP_URL` matches the exact origin the browser is on (no trailing slash, https not http).

### 9. Operating notes

- **Logs:** Vercel Dashboard → **Project → Logs** (or `vercel logs --follow`). Function errors include the full stack — bcrypt / Neon / Upstash failures all surface here.
- **Schema migrations:** edit `schema.sql`, run the diff in Neon's SQL editor. For larger changes use a Neon branch to test, then merge by re-running on `main`. There's no migration tool wired up yet — schema is small enough to manage by hand.
- **Rotating secrets:** generate new values in GitHub / Google / Upstash, update them in Vercel env vars, then **Redeployments → Redeploy** (env changes don't auto-trigger).
- **Preview deployments:** each PR gets a `*.vercel.app` URL. OAuth won't work there unless you (a) register a separate OAuth app per preview domain, or (b) gate OAuth behind `VERCEL_ENV === 'production'` in code. The simplest path is to test OAuth only on production.
- **Cost ceiling:** the Hobby plan caps at 100 GB bandwidth, 100 GB-hours of function execution, 256 MB KV, 0.5 GB Neon storage. Monitor at Vercel **Usage** tab + Neon/Upstash dashboards. Set up billing alerts before they bite.
- **Backups:** Neon takes automatic point-in-time backups (7-day window on Hobby). Upstash sessions are ephemeral by design — no backup needed.

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

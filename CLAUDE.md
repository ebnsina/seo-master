# SEOMaster — Engineering Guide (CLAUDE.md)

All-in-one SEO SaaS that takes a zero-visitor site toward ranking on Google. Built for **non-technical, SEO-beginner users** — the app teaches as it works. See `../plan.md` for product vision, modules, and roadmap.

---

## Golden rules (read every time)

1. **Never assume API/library behavior. Verify with Context7 first.** Before using or upgrading any library, framework, or SDK (SvelteKit, Drizzle, Zod, TanStack Query, Tailwind, etc.), pull current docs via the Context7 MCP (`resolve-library-id` → `query-docs`). Our SvelteKit uses _experimental_ features (remote functions, async) whose APIs change — confirm, don't guess.
2. **Write modular, maintainable, clean code.** Small focused files, single responsibility, clear names. No dead code, no copy-paste. Match the style of surrounding code.
3. **Type-safe end to end.** No `any`. Let Zod schemas and Drizzle infer types; share types, don't redeclare them.
4. **Validate all external input with Zod** at the boundary (remote function args, form data). Trust nothing from the client.
5. **Keep it working without AI and without paid APIs.** Every feature degrades gracefully (see plan §1, §4, §5). AI is BYOK and optional.

---

## Tech stack (locked)

| Layer        | Choice                                                                        | Notes                                                                                                                                                                                                                                           |
| ------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | **SvelteKit (fullstack)** + Svelte 5 (runes)                                  | Config lives in `vite.config.ts` via `sveltekit()` — there is **no `svelte.config.js`**.                                                                                                                                                        |
| Server logic | **Remote functions** (`$app/server`: `query`, `command`, `form`, `prerender`) | Experimental flags already enabled. Prefer these over `+page.server.ts` load/actions for data + mutations.                                                                                                                                      |
| Validation   | **Zod v4**                                                                    | Zod is a Standard Schema validator → pass schemas directly to `query`/`command`/`form`.                                                                                                                                                         |
| Client data  | **TanStack Svelte Query v6** — _only where needed_                            | Use for complex client-side caching/refetch/optimistic UI. For simple cases, remote `query` is already reactive — don't add Query needlessly.                                                                                                   |
| Styling      | **Tailwind CSS v4** + `@tailwindcss/typography`                               | Typography plugin for rendered article/content previews. No CSS-in-JS.                                                                                                                                                                          |
| ORM / DB     | **Drizzle ORM** + **PostgreSQL** (`postgres-js`)                              | Schema in `src/lib/server/db/schema.ts`.                                                                                                                                                                                                        |
| Auth         | **Simple cookie sessions, hand-rolled. No third-party auth.**                 | Hashed password + signed/opaque session cookie (`httpOnly`, `secure`, `sameSite`). Session stored in DB. No NextAuth/Clerk/Lucia dependency.                                                                                                    |
| AI           | **TanStack AI** (`@tanstack/ai` + provider adapters) — provider-agnostic      | Optional. Consumer picks provider via env `AI_PROVIDER` (openai/anthropic/gemini/ollama) + `AI_MODEL` + `AI_API_KEY`. Server-side `chat({outputSchema})` (Zod) for structured drafts. Not locked to any vendor. Content briefs work without it. |
| Integrations | **Google** (Search Console, Analytics GA4, PageSpeed/CWV) — hand-rolled       | One OAuth (webmasters + siteverification + analytics.readonly); tokens encrypted (AES-256-GCM). PageSpeed is keyless (optional `PAGESPEED_API_KEY`). All degrade gracefully. Adding scopes ⇒ existing connections must reconnect.               |
| Jobs         | **BullMQ + Redis**, in-process worker started from `hooks.server.ts`          | Optional (`REDIS_URL`). Crawls + rank refreshes run as jobs; daily rank-sweep + weekly-report schedulers. Falls back to in-process crawl when Redis is off. Extract to a separate process to scale horizontally.                                                 |
| Email        | **Nodemailer (BYO SMTP)** — `src/lib/server/email/`                           | Optional. Set `SMTP_HOST/PORT/USER/PASS` + `MAIL_FROM` (+ `APP_URL` for links) to enable. Powers the opt-in weekly SEO summary (per-user `weeklyReport`, sent by the report scheduler). No-op/hidden when unconfigured; gate on `isEmailConfigured()`.            |

---

## Project structure & conventions

```
src/
  app.d.ts                 # App.Locals (user/session), PageData types
  hooks.server.ts          # auth: read session cookie → set event.locals.user
  lib/
    server/
      db/                  # Drizzle: index.ts (client), schema.ts (tables)
      auth/                # session create/verify, password hashing
      providers/           # SEO data providers behind interfaces (free + paid, BYOK)
      ai/                  # AI adapter (optional, BYOK)
    components/            # reusable Svelte UI
    guidance/             # plain-language explainers per issue/task type (non-tech UX)
  routes/
    **/*.remote.ts         # remote functions (query/command/form) co-located w/ feature
    **/+page.svelte        # pages
```

### Remote functions

- File suffix **`.remote.ts`**. Import from `$app/server`.
- Always pass a Zod schema as the validator for any function taking args:
  ```ts
  import { query, command, form } from '$app/server';
  import { z } from 'zod';
  export const getSite = query(z.string().uuid(), async (id) => {
  	/* ... */
  });
  ```
- Use `query` for reads, `command` for mutations, `form` for progressive-enhancement forms, `prerender` for build-time static data.
- Do auth/permission checks inside the function (read `getRequestEvent().locals`). Never trust the caller.

### Env vars

- Explicit env vars feature is on. Declare in `src/env.ts` (`defineEnvVars`), import from `$app/env/private` (server) / `$app/env/public`.
- Secrets (DB URL, session secret, encrypted-key salt) are **private**. Never import secrets into client code.

### Auth (cookie sessions)

- On login: verify password → create session row → set `httpOnly` `secure` `sameSite=lax` cookie.
- `hooks.server.ts` resolves the session into `event.locals.user` on every request.
- Protect remote functions/pages by checking `locals.user`; redirect/`error(401)` if absent.

### Multi-tenancy

- Every tenant-owned query MUST scope by `organizationId`. Never return cross-org data. Add this scope at the query layer, not the UI.

---

## Commands

```bash
npm run dev          # dev server
npm run check        # svelte-check (types) — run before claiming done
npm run lint         # prettier --check + eslint
npm run format       # prettier --write
npm run db:push      # push schema to DB (dev)
npm run db:generate  # generate migration
npm run db:migrate   # run migrations
npm run db:studio    # drizzle studio
```

**Before considering any task done:** `npm run check` and `npm run lint` must pass.

---

## Git & commits (IMPORTANT)

- Author every commit as **`ebnsina <ebnsina.me@gmail.com>`** — set per-repo:
  `git config user.name "ebnsina" && git config user.email "ebnsina.me@gmail.com"`.
- **Do NOT** add a `Co-Authored-By: Claude` trailer, and do NOT use any other identity.
- Remote uses the **`github-es`** SSH host alias (e.g. `git@github-es:ebnsina/seomaster.git`).
- Internal planning docs (e.g. the top-level `plan.md`) and any local-only data are
  **gitignored / not committed** — keep the repo clean (no plans/roadmap, no secrets).
  They exist locally for reference only.
- Only commit or push when explicitly asked. If on the default branch, branch first.

---

## Non-negotiables for the beginner-first UX (see plan §2.5)

- No unexplained SEO jargon in UI — every term has a plain-language explainer.
- Each `AuditIssue` / `Task` carries structured guidance: `whatItIs`, `whyItMatters`, `howToFix[]` (per-CMS), `difficulty`, `humanImpact`, `humanEffort`. Store as content in `src/lib/guidance/`, not hardcoded in components.
- Always surface "do this next." Never leave the user staring at raw data.

---

## Design system (see `src/routes/layout.css`)

Premium light theme, warm off-white app bg (`--bg`) with clean white cards, single blue accent (`#0068A8`). All design tokens (colors, radii, fonts) live in `:root` and are exposed to Tailwind via `@theme inline` — there is one source of truth; never hardcode hex values in components, use the tokens / utilities (`bg-elev`, `text-dim`, `bg-accent-soft`, `rounded-card`, `font-display`, …).

**Flat, no shadows.** Surfaces are separated by tinted backgrounds and hairline borders, not drop shadows. Don't reintroduce `box-shadow` on cards/buttons.

**Primitives** (classes in `layout.css`): `.card` (white surface, hairline border), `.btn` / `.btn-primary` (labels stay one line — `white-space: nowrap`), `.field` (inputs), `.pill` / `.pill-good` (badges).

**Callouts — `.note`** for status & guidance: pair with a soft background variant `note-good` / `note-warn` / `note-bad` / `note-info` (tinted, **no border**) and a matching text color (`text-good` / `text-warn` / `text-bad` / `text-accent`) on the heading. Use these for verdicts, connect prompts, empty/success states — not bordered cards.

**Section grouping & hierarchy:** related issue/result groups sit in a tinted panel (`rounded-card p-5`) with an icon badge + title + faint one-line subtitle. Convention: **Search SEO** uses a neutral panel (`bg-elev-2`) with an accent-soft Search icon badge; **AI search (GEO)** uses a `bg-accent-soft` panel with a solid-accent Bot icon badge — keep the two visually distinct but structurally identical.

**Layout:** the app shell (`(app)/+layout.svelte`) has a sticky full-height desktop sidebar (`md:sticky md:top-0 md:h-screen`) and a mobile drawer; content scrolls independently.

**Icons:** Lucide via **per-icon imports** (`import X from '@lucide/svelte/icons/<name>'`) — the root barrel breaks SSR. Use `size={…}` and `class="text-…"`.

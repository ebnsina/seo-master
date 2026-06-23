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

| Layer        | Choice                                                                        | Notes                                                                                                                                                        |
| ------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework    | **SvelteKit (fullstack)** + Svelte 5 (runes)                                  | Config lives in `vite.config.ts` via `sveltekit()` — there is **no `svelte.config.js`**.                                                                     |
| Server logic | **Remote functions** (`$app/server`: `query`, `command`, `form`, `prerender`) | Experimental flags already enabled. Prefer these over `+page.server.ts` load/actions for data + mutations.                                                   |
| Validation   | **Zod v4**                                                                    | Zod is a Standard Schema validator → pass schemas directly to `query`/`command`/`form`.                                                                      |
| Client data  | **TanStack Svelte Query v6** — _only where needed_                            | Use for complex client-side caching/refetch/optimistic UI. For simple cases, remote `query` is already reactive — don't add Query needlessly.                |
| Styling      | **Tailwind CSS v4** + `@tailwindcss/typography`                               | Typography plugin for rendered article/content previews. No CSS-in-JS.                                                                                       |
| ORM / DB     | **Drizzle ORM** + **PostgreSQL** (`postgres-js`)                              | Schema in `src/lib/server/db/schema.ts`.                                                                                                                     |
| Auth         | **Simple cookie sessions, hand-rolled. No third-party auth.**                 | Hashed password + signed/opaque session cookie (`httpOnly`, `secure`, `sameSite`). Session stored in DB. No NextAuth/Clerk/Lucia dependency.                 |
| AI           | **Anthropic SDK** (`@anthropic-ai/sdk`), model `claude-opus-4-8`, BYOK        | Optional (env `ANTHROPIC_API_KEY`). Structured output via `messages.parse` + `zodOutputFormat`. Content briefs work without it. Verify via claude-api skill. |
| Integrations | **Google Search Console** (OAuth 2.0), hand-rolled                            | Optional (env-gated). Tokens encrypted via `$lib/server/crypto` (AES-256-GCM). Degrades to guided-manual submission. See `.env.example`.                     |

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

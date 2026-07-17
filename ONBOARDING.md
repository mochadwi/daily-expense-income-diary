 # Defiance Capital Assessment — Project Onboarding

> A grounded walkthrough of this repo so you can defend it in an interview.
> Everything below reflects what's actually built in `api/` and `frontend/`,
> not generic advice. Cross-checked against `README.md` (the spec).

---

## 1. The 30-second pitch (memorize this)

> "It's a **Daily Expense & Income Diary** — a full-stack CRUD app. The backend
> is Express + TypeScript + SQLite (via `better-sqlite3`), exposing a REST API
> at `/api/transactions`. The frontend is React + Vite + Ant Design. Both are
> in TypeScript, the API has a Vitest + supertest test suite (27 tests), and
> it's designed to run locally within the assessment's 1–2 hour window. Auth,
> deployment, and charts were intentionally out of scope."

If they ask "why this stack": Express matches the original assessment's
conventions, SQLite needs no external DB server (good for a take-home), and
Ant Design gives a polished, responsive UI fast without hand-rolling
components.

---

## 2. Architecture (the diagram you should be able to draw)

```
Browser (your Mac)
   │  fetch('/api/transactions')   ← relative path, same origin
   ▼
Vite dev server  :5173   (frontend, React+AntD)
   │  proxy /api → http://localhost:3001
   ▼
Express API      :3001   (api/src/server.ts)
   │  validate → SQL
   ▼
SQLite (better-sqlite3, file: ./data/diary.db)
```

**Key point for the tunnel/forwarding issue:** the browser only ever talks
to port 5173 (the forwarded address). It uses a **relative** `/api` path, so
requests go to whatever origin served the page. Vite then proxies `/api` to
`localhost:3001` *on the VPS*. The browser never touches 3001 directly. This
is why `VITE_API_URL=/api` (not `http://localhost:3001/api`) when accessing
through a tunnel.

Three tiers: **React UI → Express controller → SQLite**. No ORM — raw
parameterized SQL via `better-sqlite3`.

---

## 3. Repo layout & where things live

```
api/
  src/
    server.ts        # entry: loads dotenv, listens on PORT (3001)
    app.ts           # builds the Express app + reset()/close() helpers for tests
    db.ts            # SQLite connection + schema (CREATE TABLE) + resetDb()
    validation.ts    # validateCreate / validateUpdate (pure functions)
    routes/transactions.ts  # all 5 CRUD routes
    types.ts         # TransactionType, Category, Transaction, enums
  specs/transactions.spec.ts  # 27 Vitest + supertest tests
frontend/
  src/
    main.tsx         # ConfigProvider + theme, mounts <App>
    App.tsx          # state, data fetching, modal wiring, layout
    api.ts           # fetch wrapper, ApiError class, api.{list,get,create,update,remove}
    types.ts         # mirrors api/src/types.ts (kept in sync manually)
    format.ts        # formatCurrency helper
    components/
      SummaryCards.tsx         # income/expense/balance Statistic cards
      TransactionFilters.tsx   # type/category/sort selects + refresh/clear
      TransactionTable.tsx     # AntD Table with edit/delete actions
      TransactionForm.tsx      # Modal + Form for create/edit
```

**Interview gotcha:** the README §7 says `api/src/index.ts`, but you split it
into `app.ts` (testable app factory) + `server.ts` (listen). Be ready to
explain *why* — it's a deliberate improvement: `createApp()` returns the
Express `app` *without* calling `listen()`, so supertest can invoke handlers
in-process without binding a TCP port. This is exactly what §5.6 of the
README describes.

---

## 4. Data model

One table, `transactions`:

| field | type | constraints |
|-------|------|-------------|
| `id` | INTEGER | PK, auto-increment |
| `type` | TEXT | NOT NULL, CHECK in ('expense','income') |
| `amount` | REAL | NOT NULL, CHECK > 0 |
| `category` | TEXT | NOT NULL, CHECK in 7 predefined values |
| `date` | TEXT | NOT NULL (ISO `YYYY-MM-DD`) |
| `description` | TEXT | nullable |
| `created_at` | TEXT | DEFAULT `datetime('now')` |
| `updated_at` | TEXT | DEFAULT `datetime('now')`, refreshed on PUT |

Categories: **Food, Transport, Salary, Entertainment, Utilities, Healthcare,
Others**.

**Why no normalization / no separate categories table?** Explicit MVP scope
decision — one table keeps it inside 1–2 hours. The CHECK constraints enforce
the enum at the DB level *in addition to* app-level validation, so bad data
can't get in even if a client bypasses the API.

Indexes on `type`, `category`, `date` — supports the filter/sort queries.

---

## 5. API design — be fluent on all 5 endpoints

Base: `/api/transactions`

| Method | Path | Status | Notes |
|--------|------|--------|-------|
| GET | `/` | 200 | list, with `?type=&category=&sortBy=&order=` |
| POST | `/` | **201** | create; returns the new row with `id` |
| GET | `/:id` | 200 / 404 | single read |
| PUT | `/:id` | 200 / 404 | full-or-partial update; ≥1 field required |
| DELETE | `/:id` | 200 | returns `{ success:true, data:null }` |

**Response envelope** everywhere: `{ success: true, data: ... }` or
`{ success: false, error: "..." }`.

**Validation rules** (these come up a lot):
- `type` — required, must be `expense`|`income`
- `amount` — required, finite number, **must be > 0** (not ≥ 0 — zero is rejected)
- `category` — required, must be one of the 7
- `date` — required, must be a **real calendar date** in `YYYY-MM-DD` (e.g.
  `2024-02-30` is rejected, not just format-checked). The validator parses
  it and checks the round-tripped UTC components match.
- `description` — optional; omitted → stored as `null`

**PUT semantics:** every field is optional, but *at least one* must be
present (else 400 "At least one updatable field must be provided").
`updated_at` is auto-refreshed to `datetime('now')`.

**Filter/sort on GET:**
- `type`/`category` filters are validated — invalid values return **400**,
  not ignored.
- `sortBy`/`order` use a **whitelist**: invalid values silently fall back to
  defaults (`date` / `desc`). This is intentional — sort params aren't "wrong
  data," they're just unsupported, so defaulting is friendlier than erroring.
  Be ready to defend this choice either way; an interviewer might prefer 400.
  The honest answer: "I chose fail-safe for sort, fail-loud for filters.
  Reasonable people could disagree."
- SQL injection safety: `sortField` and `sortOrder` are whitelisted enums
  before interpolation, and `type`/`category`/`id` use **parameterized
  queries** (`?` placeholders). Never string-concatenate user input into SQL.

**Error codes:**
- 400 — validation
- 404 — missing `id`, or any unknown route (fallthrough handler in `app.ts`)
- 500 — unexpected DB failure (final error handler)

---

## 6. Frontend design

**State management:** React hooks only (`useState`, `useEffect`,
`useCallback`, `useMemo`) — no Redux/Zustand, per the spec. Data lives in
`App.tsx` as `data: Transaction[]`.

**Data flow:**
1. `App` calls `api.list(filters)` on mount and whenever `filters` change
   (effect depends on `filters`).
2. Create/update/delete do **optimistic local state updates** — on success,
   prepend/replace/filter the array without refetching. This is faster and
   simpler than refetching; trade-off is if the server's sort differs from
   client order, a stale snapshot can show. For an MVP it's fine.
3. Errors surface as AntD `message.error` toasts + a closable `Alert` banner
   for load failures.

**Components:**
- `SummaryCards` — income/expense/balance, computed via `reduce`. Income
  green, expense red, balance sign-colored.
- `TransactionFilters` — controlled selects; "Clear" resets to defaults and
  disables itself when already at defaults.
- `TransactionTable` — AntD `Table`, paginated (10/page), with client-side
  sorters on date & amount columns, color-coded type tags, and edit/delete
  actions. Delete uses `Popconfirm` ("Delete this transaction?") per the
  spec.
- `TransactionForm` — Modal + AntD `Form`. `key={initial?.id ?? 'new'}` +
  `destroyOnClose` forces a clean remount per transaction so
  `initialValues` refills correctly (avoids stale-field bugs when switching
  from edit-A to edit-B).

**Theming:** `main.tsx` sets a custom AntD theme via `ConfigProvider` (indigo
primary, semantic green/red). Wrapped in `<AntApp>` so `message` inherits the
theme tokens.

**API client (`api.ts`):**
- `ApiError` class carries the HTTP `status`.
- Generic `request<T>` reads response as text, parses JSON safely (throws
  `ApiError` on invalid JSON), checks `response.ok` **and** `payload.success`.
- Handles DELETE's `data: null`.

---

## 7. Testing — know the 27 tests

File: `api/specs/transactions.spec.ts`. Uses **Vitest + supertest**,
in-process (no HTTP socket) against an **in-memory** SQLite DB (`:memory:`),
reset between tests via `resetDb()` (clears rows + resets `sqlite_sequence`
so IDs restart at 1).

Coverage:
- **POST:** happy path (201 + row), sequential IDs, and 6 validation
  rejections (bad type, negative amount, zero amount, bad category, bad
  date, impossible calendar date) + description-omitted → null.
- **GET list:** default order (date desc), filter by type, filter by
  category, combined filters, 400 on bad type filter, sort by amount
  asc/desc.
- **GET /:id:** found, 404 missing, 400 non-integer id.
- **PUT:** update existing, 404 missing, 400 empty body, 400 invalid value,
  verifies `updated_at >= created_at`.
- **DELETE:** deletes + confirms subsequent GET is 404, 404 on missing.
- **Health** + **404 fallthrough**.

**Why in-memory DB?** Tests are fast, isolated, and don't leave files on
disk. `createApp(':memory:')` is the seam that enables it.

**Be ready for:** "Why no frontend tests?" → The README §8 explicitly says
frontend testing isn't required for the 1–2h scope; manual UI verification is
sufficient. Honest answer: I'd add React Testing Library + MSW for the
`api.ts` layer and component rendering if scope allowed.

---

## 8. Key decisions & tradeoffs (this is where interviews are won/lost)

| Decision | Rationale | Trade-off / what I'd do differently at scale |
|----------|-----------|-----------------------------------------------|
| `better-sqlite3` (synchronous) | No async ceremony, simpler code, fewer bugs | Single-threaded; fine for demo, swap to Postgres + a connection pool for prod |
| App-level validation **+** DB CHECK constraints | Defense in depth — bad data rejected even if a client bypasses the API | Two places to update the category list (types.ts + schema) — acceptable for MVP |
| Whitelist-and-default for sort params | Friendly UX; avoids erroring on harmless typos | Arguable — could return 400 for stricter contract |
| Optimistic local state updates on CUD | Fast, no extra round-trip, simple | Could drift from server sort; refetch-on-change is safer |
| No auth | Explicitly scoped out (README §9) | Would add a lightweight JWT or even hardcoded demo creds if required |
| Relative `/api` + Vite proxy | Works across localhost, tunnels, and same-origin deploys without env changes | For a split deploy (frontend on Vercel, API on Railway) you'd need an absolute URL + CORS |
| `app.ts`/`server.ts` split | Makes the app testable with supertest without binding a port | Slightly more files than the spec's single `index.ts` |
| Mirrored `types.ts` in frontend | Keeps frontend self-contained, no backend code in the Vite bundle | Two copies to keep in sync; a shared `types` package would fix this in a monorepo |

---

## 9. Likely questions & strong answers

**Q: Walk me through what happens when a user creates a transaction.**
A: User clicks "Add transaction" → `TransactionForm` modal opens. On submit,
`form.validateFields()` runs AntD rules, then calls `onSubmit` in `App`,
which calls `api.create()` → `POST /api/transactions`. Express's
`validateCreate` checks type/amount/category/date, runs a parameterized
`INSERT`, then `SELECT`s the row back by `lastInsertRowid` and returns 201
with the row. `App` prepends it to state and shows a success toast. On error,
`ApiError` surfaces in a toast.

**Q: How do you prevent SQL injection?**
A: Three layers. (1) `type`/`category`/`id` use `?` parameterized statements
— never string-interpolated. (2) `sortBy`/`order` can't be parameterized in
an `ORDER BY` clause, so they're validated against a whitelist enum
(`SORT_FIELDS`/`ORDERS`) *before* interpolation — an attacker can't inject
because only `date`/`amount` and `asc`/`desc` are possible. (3) DB CHECK
constraints reject out-of-enum `type`/`category` at the storage layer as a
backstop.

**Q: Why `better-sqlite3` instead of an ORM like Prisma?**
A: For a 1–2 hour MVP with one table and simple queries, an ORM adds install
weight, config, and a schema file for no real benefit. `better-sqlite3` is
synchronous (no async/await noise), well-maintained, and the SQL is trivial
to read. At scale with multiple tables/relations, I'd reach for Prisma or
Drizzle for migrations and type-safe queries.

**Q: How would you scale this for production?**
A: Swap SQLite for Postgres (concurrency), add a connection pool, add input
rate-limiting and auth (JWT), containerize both services, deploy API to
Railway/Render and frontend to Vercel/Netlify with `VITE_API_URL` pointing at
the API and CORS locked down. Add a categories table + migrations. Add
frontend tests (RTL + MSW) and CI. Consider indexes on common filter
combos. Replace optimistic updates with either SWR/React Query caching or a
refetch-after-mutation policy.

**Q: What's the hardest bug you hit?**
A: (Real one, from this session) The app appeared broken when accessed
through a tunnel because `VITE_API_URL=http://localhost:3001/api` is baked
into the bundle at build time and resolves to the *visitor's* machine, not
the server. Fix: use a relative `/api` path so the browser calls its own
origin, and let Vite's dev proxy forward to the backend on the server.
Lesson: env vars in Vite are **client-side** — they run in the user's
browser, not on the server.

**Q: Why does the form remount when switching between edit targets?**
A: `key={initial?.id ?? 'new'}` + `destroyOnClose`. AntD `Form` caches
`initialValues` on first render and won't re-read them if the same form
instance stays mounted. Without the key change, editing transaction A then B
would show A's values. The key forces a fresh mount with B's values.

**Q: What's missing that you'd add next?**
A: Auth, frontend tests, proper migrations (right now schema is
`CREATE TABLE IF NOT EXISTS` in `db.ts`), CSV export, per-category charts,
and splitting the frontend bundle (it's ~1.15MB because AntD isn't
code-split — `manualChunks` would fix it).

---

## 10. Things to double-check before the interview

1. **You** ran the tests and build — be ready to say "27 tests pass,
   `tsc --noEmit` is clean on both packages, `vite build` succeeds."
2. The `.env` fix we made (`VITE_API_URL=/api`) is a **local-only** change
   and `.env` is gitignored — it's *not* in the repo. If they ask how to run
   it, tell them to copy `.env.example` (which still has the absolute URL)
   and change it to `/api` only if accessing via a tunnel. For plain
   localhost, the example file works fine.
3. Know the one place the spec and code differ: `server.ts` vs `index.ts` —
   and why yours is better.

---

## 11. Quick run commands

```bash
# Backend (Express + SQLite) — http://localhost:3001
cd api
npm install
npm run dev          # or: npm start

# Frontend (Vite + React + AntD) — http://localhost:5173
cd frontend
npm install
npm run dev

# Tests + typecheck (from api/)
npm test             # 27 tests
npm run typecheck    # tsc --noEmit

# Production build (from frontend/)
npm run build        # tsc --noEmit && vite build → dist/
```

If accessing the dev server through a tunnel/port-forward, set
`frontend/.env` to `VITE_API_URL=/api` so the browser uses a relative path
(same origin) and Vite's proxy handles routing to the API on the server.
For plain localhost access, the default `.env.example` works as-is.

---

*Generated alongside the build/verify session on 2026-07-17.*

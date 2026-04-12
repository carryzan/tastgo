# Tastgo — Agent Instructions

## Stack

- Next.js 16 App Router
- Supabase (auth + database, no CLI, no generated types)
- Tailwind CSS + shadcn/ui
- TypeScript

---

## Skills first

Before writing any code, check if a relevant skill exists in `.agents/skills/` and follow it. Skills cover best practices for Next.js, Supabase, Vercel, React, shadcn, and more. Always prefer the skill over guessing.

---

## Project structure

```
tastgo/
├── app/
│   ├── layout.tsx
│   ├── not-found.tsx
│   ├── error.tsx
│   ├── (marketing)/          # reserved, empty for now
│   │   └── layout.tsx
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/
│   │       └── page.tsx
│   └── (protected)/
|       └──[kitchen-id]          # all auth-gated routes
│          ├── layout.tsx
│          ├── dashboard/        # example route
│          │   ├── page.tsx
│          │   ├── loading.tsx
│          │   ├── error.tsx
│          │   ├── _components/  # dashboard-only components
│          │   └── _lib/         # dashboard-only queries and actions
│          └── [other-routes]/   # follow same pattern as dashboard
│              ├── page.tsx
│              ├── _components/
│              └── _lib/
├── components/
│   ├── ui/                   # shadcn components — do not edit manually
│   └── shared/               # shared custom components only when needed
│   └── layout/               # navbar, sidebar, footer
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # createBrowserClient()
│   │   ├── server.ts         # createServerClient()
│   │   ├── middleware.ts          # updateSession helper
│   │   └── queries/          # global shared reads
│   │       └── [domain].ts
│   ├── actions/              # global shared server actions
│   │   └── [domain].ts
│   └── utils/
├── hooks/
├── public/
├── middleware.ts                  # Next.js 16 — replaces middleware.ts
└── .env.local
```

### File placement rules

- Used by **one route only** → colocate in that route's `_components/` or `_lib/`
- Used by **multiple routes** → promote to `components/`, `lib/`, or `hooks/`
- **Queries** (reads) → `_lib/` for route-specific, `lib/supabase/queries/` for global
- **Actions** (mutations) → `_lib/` for route-specific, `lib/actions/` for global
- **Components** → `_components/` for route-specific, `components/` for global

---

## Naming conventions

- **Everything uses kebab-case** — files, folders, all of it
- Examples: `login-form.tsx`, `use-user.ts`, `update-password.ts`, `billing-card.tsx`
- Exception: Next.js special files keep their required names (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`)

---

## Next.js rules

### Server components are the default

Every component is a Server Component unless it has `'use client'` at the top. Never add `'use client'` unless the component actually needs it.

**Use `'use client'` only when the component uses:**

- `useState`, `useEffect`, `useRef` or any React hook
- Event handlers (`onClick`, `onChange`, etc.)
- Browser APIs (`window`, `localStorage`, `document`)
- A third-party library that requires client context

**Never use `'use client'` for:**

- Data fetching — do it directly in Server Components
- Passing props down — that does not require a client boundary
- Components that only render static or server-fetched content
- Solving a hydration error by default — fix the root cause

**Keep `'use client'` boundaries as deep and narrow as possible.** If only a button needs interactivity, extract just that button. Do not mark the whole page or layout as client.

### Data fetching

- Fetch data directly in async Server Components — no Route Handlers needed
- For mutations use Server Actions with `'use server'` at the top of the file
- Never call a Route Handler from a Server Component
- Pass data down as props to Client Components — do not re-fetch on the client what the server already has

### Server Actions

- Always add `'use server'` at the top of action files
- Global actions → `lib/actions/[domain].ts`
- Route-specific actions → colocate in `_lib/` next to the route

### Special files

- `layout.tsx` — persistent wrapper; use for shared UI and auth checks; Server Component
- `page.tsx` — the public-facing route; always a Server Component; use default export
- `loading.tsx` — Suspense skeleton shown while the page loads
- `error.tsx` — error boundary; must be a Client Component (`'use client'`)
- `not-found.tsx` — 404 UI

### Routing

- `proxy.ts` at root is the Next.js 16 replacement for `middleware.ts`
- Keep `proxy.ts` lightweight — only handle redirects, no heavy logic
- Real session verification happens in `(protected)/layout.tsx` using the server Supabase client
- Route groups `(name)` organise routes without affecting URLs
- Private folders `_name` are non-routable — safe to colocate any file there

---

## Supabase rules

### Two clients — never mix them

- `lib/supabase/client.ts` → **Client Components only** (browser)
- `lib/supabase/server.ts` → **Server Components, Server Actions, layouts** (server)
- Never use the browser client in server code — it bypasses cookies and loses the session

### Cookies

- `@supabase/ssr` handles cookies automatically — do not write manual cookie config
- Always use `supabase.auth.getClaims()` in server code to verify the session — never `supabase.auth.getSession()`, it does not revalidate the JWT
- Always initialise the Supabase server client inside the request handler, never at module scope
- Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in env vars — not the old `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Auth pattern

- Auth is login-only — no signup, no email confirmation flows
- Password update is done in-app while the user is already signed in (no email link needed)
- Session check → `(protected)/layout.tsx` using server client + `getClaims()`
- Redirect unauthenticated users to `/login` from `(protected)/layout.tsx`

---

## Tailwind + shadcn rules

- Use Tailwind utility classes for all styling — no inline styles, no CSS modules
- Use shadcn/ui components from `components/ui/` — do not rewrite what shadcn provides
- To add a new shadcn component run `npx shadcn@latest add <component>` — never create it manually
- Wrap shadcn components to extend them — never edit files inside `components/ui/`
- Use `lucide-react` for all icons — it comes with shadcn, no separate install needed

---

## TypeScript rules

- Always TypeScript — no `.js` files
- No `any` — use `unknown` or infer the type properly
- No type assertions (`as SomeType`) unless genuinely unavoidable
- Use `interface` for object shapes, `type` for unions and aliases

---

## General rules

- **Named exports** for all components — default exports only for Next.js special files (`page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`, `not-found.tsx`)
- Use `next/image` for all images — never a raw `<img>` tag
- Use `next/link` for all internal navigation — never a raw `<a>` tag
- Keep components small and focused — if a component is doing too much, split it
- Never put secrets or server-only logic in Client Components
- `providers.tsx` in `app/` is a `'use client'` component that composes all global providers — imported once by `app/layout.tsx`
- We are not building (marketing) route for now.


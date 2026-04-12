# Tastgo

Private web app for **kitchen operations**: one Supabase-backed product where each **kitchen** is a workspace. Staff sign in, pick a kitchen, and work inside routes like `/[kitchen-id]/dashboard` and `/[kitchen-id]/inventory`.

The product direction is end-to-end ops—orders, menu, inventory, production, procurement, stock counts, expenses, cash, staff, and reconciliation—with **permission-based navigation** so people only see what their role allows. Features ship incrementally; the repo currently centers on auth, kitchen context, and **inventory** (items, categories, units of measure), plus shared settings patterns.

**Stack:** Next.js (App Router), Supabase (auth + Postgres), TanStack Query/Table where needed, Tailwind CSS and shadcn/ui.

---

## Setup

1. Add Supabase env vars to `.env.local` (names and patterns are in `AGENTS.md`).
2. `npm install`
3. `npm run dev` → http://localhost:3000

**Scripts:** `npm run dev` · `npm run build` / `npm run start` · `npm run lint`

Repo layout and coding rules: `AGENTS.md`.

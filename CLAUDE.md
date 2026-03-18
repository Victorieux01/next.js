# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server with Turbopack
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
```

There are no automated tests configured. The `/api/seed` route can be used to seed the database.

## Architecture

**Coredon Dashboard** — a full-stack invoice and customer management app built with Next.js App Router, TypeScript, Tailwind CSS, and PostgreSQL.

### Key directories

- `app/(overview)/` — Public landing page
- `app/login/` — Auth page
- `app/dashboard/` — Protected area with sidebar layout
  - `invoices/` — List, create (`/create`), edit (`/[id]/edit`)
  - `customers/` — Customer list with stats
- `app/api/` — API routes (Stripe, SendGrid, seed, query)
- `app/lib/` — Data fetching (`data.ts`), server actions (`actions.ts`), types (`definitions.ts`), auth utils
- `app/ui/` — All UI components, colocated by feature

### Database

Raw PostgreSQL via the `postgres` npm package (no ORM). All queries use SQL template literals in `app/lib/data.ts`. Schema: `users`, `customers`, `invoices` (status: `pending` | `paid` | `pending_deletion`), `revenue`.

Connection requires `DATABASE_URL` (Supabase pooler with `ssl: 'require'`).

### Authentication

NextAuth v5 beta (credentials provider). Config split across:
- `auth.config.ts` — authorized callback and redirects
- `auth.ts` — credentials provider with bcrypt password check
- `middleware.ts` — protects `/dashboard/*` routes

### Payments & Email

- **Stripe**: API routes in `app/api/create-payment-intent/`, `app/api/pay-invoice/`, `app/api/create-subscription/`
- **SendGrid**: Used in `app/api/invoice_deletion/` to send deletion confirmation emails with accept/decline links

### Form handling

Server Actions (`"use server"`) with Zod validation. Actions defined in `app/lib/actions.ts`, called from form components via `action` prop.

## Required environment variables

```
POSTGRES_URL
AUTH_SECRET
AUTH_URL
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
NEXT_PUBLIC_APP_URL
```

# Annie’s Halo Halo

Responsive business website and order management application for Annie’s Halo Halo in Loreto, Agusan del Sur. The source is built on Next.js 16, React, TypeScript, Supabase Auth, PostgreSQL, and Supabase Storage.

## What is implemented

- English and Filipino public pages for the homepage, menu, product details, about, contact, policies, ordering, and reservations.
- Customer registration, email verification, login, password reset, profile management, and account history.
- Browser cart and authenticated checkout. PostgreSQL rechecks product availability, option prices, delivery rules, payment method, and the submitted total before it creates a PHP order. Optional PayMongo Hosted Checkout v2 uses server-side sessions and a signed, idempotent webhook; success redirects never establish payment.
- Reservation requests limited to future, configured time slots and capacity. A request remains pending until staff review it.
- Role protected admin screens for dashboard metrics, products, photos, categories, options, orders, reservations, public business settings, and staff access.
- Supabase RLS policies, customer ownership checks, status transition RPCs, audit records, and storage access policies in the initial migration.

The site intentionally starts with orders, payment methods, and reservations disabled. No prices, menu items, photos, hours, service areas, payment credentials, or reservation slots are made up. PayMongo remains hidden until server credentials and webhook configuration are supplied and an administrator enables it. Read [the setup and launch checklist](docs/setup.md) before opening the site to customers.

## Local development

1. Use Node.js 22.12 or newer and npm.
2. Copy `.env.example` to `.env.local` and add your Supabase project URL and publishable key.
3. Apply `supabase/migrations/202610290001_initial_business_system.sql` in the Supabase SQL Editor.
4. Set the Supabase Auth site URL and callback allowlist, then create and verify the owner account.
5. Bootstrap the first administrator using the SQL in [docs/setup.md](docs/setup.md).
6. Run `npm install` and `npm run dev`.

See [docs/setup.md](docs/setup.md) for production configuration, account bootstrap, payment limitations, business data, backups, and deployment.

## Commands

- `npm run dev` — local Next.js development server
- `npm run typecheck` — TypeScript check
- `npm run lint` — ESLint check
- `npm test` — unit tests
- `npm run build` — production build
- `npm run test:e2e` — Playwright smoke tests (requires the Playwright browser installation)


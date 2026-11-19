# Setup and launch checklist

## 1. Create and connect Supabase

Create a Supabase project in the region appropriate for the business. From **Project Settings → API**, copy the project URL and publishable key into a local `.env.local` file based on `.env.example`. The publishable key is intended for browser use; never put a service role key in a `NEXT_PUBLIC_` variable or commit secrets.

Apply `supabase/migrations/202610290001_initial_business_system.sql` in the Supabase SQL Editor while signed in as the project owner. It creates the application tables, row level security policies, RPC functions, audit records, and the public menu image bucket. Confirm the SQL Editor reports that the full script completed. The migration has not been applied to a live Supabase project from this workspace.

Apply later migration files in filename order as you update the application. The premium customer dashboard uses `202611160001_customer_dashboard_favorite.sql`; the admin sales chart and top-selling products use `202611160002_admin_dashboard_insights.sql`. The functions enforce their respective customer or administrator role checks, and the admin dashboard displays a setup notice until its migration is applied.

## 2. Configure Auth

In **Authentication → URL Configuration**:

- Set the Site URL to the local or deployed origin.
- Add `<origin>/auth/callback` to the redirect URL allowlist (for example `http://localhost:3000/auth/callback`).
- Configure production email delivery and an appropriate password-reset email template before launch.
- Disable **Confirm email** under the email provider settings if customers should be able to sign in immediately after registration. Supabase will automatically mark the submitted email address as confirmed when this setting is off.
- Consider enabling Supabase Auth CAPTCHA and review the project’s rate limits and abuse controls.

Set `APP_BASE_URL` to the exact public origin in each deployment environment. Use HTTPS in production.

## 3. Create the first administrator

Register the owner through the site, then run this query in the trusted Supabase SQL Editor. Replace the email with the owner account. This bootstrap query is for the initial administrator only; do not expose it through a public page or client code.

```sql
insert into public.user_roles (user_id, role)
select id, 'administrator'
from auth.users
where lower(email) = lower('owner@example.com')
on conflict (user_id, role) do nothing;
```

Sign in and open `/admin`. Administrators can then assign staff roles to existing accounts from **Staff access**. The database protects the last administrator from accidental removal.

## 4. Add real business information

From **Admin → Business settings**, verify the public business name, address, contact details, and actual hours. From **Menu & products**, enter owner-confirmed menu items, prices in centavos, categories, availability, variants, add-ons, and product photos. Photos must be JPEG, PNG, WebP, or AVIF and no larger than 5 MB.

Orders remain unavailable until the owner enables a fulfillment method and its matching cash payment method. For delivery, add exact service area names, delivery fees, and minimums. For reservations, configure each reservation type and future slot with a capacity before enabling requests. Capacity for party-size types counts guests; other reservation types count requests.

The settings stored in `business_settings` are public website configuration. Never put API keys, private contact notes, or payment credentials there.

## 5. Payments

Cash on pickup and cash on delivery are available when enabled by an administrator. Staff can record cash as paid only after physically receiving the full amount; the change is audited. PayMongo Hosted Checkout v2 is also implemented, but it stays hidden until the server has all of these values:

- `PAYMONGO_SECRET_KEY` — use a test key (`sk_test_...`) in staging and a live key (`sk_live_...`) only in production.
- `PAYMONGO_WEBHOOK_SECRET` — the secret for the webhook endpoint in that same mode.
- `PAYMONGO_PAYMENT_METHOD_TYPES` — comma-separated enabled channels; this integration accepts `gcash`, `paymaya`, `qrph`, and `card`.
- `SUPABASE_SERVICE_ROLE_KEY` — used only by the signed webhook handler. Keep it server-side and out of browser variables.

After adding the keys, open **Admin → Business settings** and explicitly enable PayMongo. Only configure channels approved and enabled in the PayMongo dashboard. When GCash or Maya is configured, checkout offers separate wallet choices and creates a PayMongo session restricted to the selected channel before redirecting the customer to the provider flow. Funds settle to the merchant account connected to PayMongo, not to a personal QR image. The checkout stores the Checkout Session ID; the browser return never marks an order paid.

Register `https://<your-domain>/api/webhooks/paymongo` in PayMongo for `checkout_session.payment.paid`. Use a separate test endpoint and secret for staging and a live endpoint and secret for production. The handler verifies PayMongo's raw-body HMAC signature and mode, checks the session/reference/amount/currency against the order, and records each event ID once. Duplicate deliveries are acknowledged idempotently. Failed individual attempts remain pending so the customer can retry inside the same hosted session. When a customer or staff member cancels an unpaid online order, the app first asks PayMongo to expire the session; it will not cancel while payment may still be processing. If a session expired in the PayMongo dashboard, the next resume attempt verifies and records that state. Do not manually edit payment status in SQL.

For a delayed event, check the PayMongo dashboard using the order reference and Checkout Session ID, inspect webhook delivery history, and resend the signed event after restoring the endpoint or secret. A customer landing on the success URL is never sufficient evidence of payment. Refunds, partial refunds, automatic expiry of abandoned sessions, and a full provider test transaction have not been completed in this workspace; keep those cases under the business's manual reconciliation process until implemented and tested.

## 6. Deploy

Deploy the repository as a Next.js application (for example, with Vercel). Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `APP_BASE_URL` in the production environment, and add the production callback URL to Supabase Auth. Apply migrations to the intended Supabase project before deployment. Add `SUPABASE_SERVICE_ROLE_KEY` and the PayMongo keys only if enabling the webhook flow. Review the production build logs and verify registration, email callbacks, RLS ownership, image upload, order placement, status changes, reservation capacity, and the complete PayMongo test-mode checkout/webhook flow in staging before launch.

This workspace does not contain live Supabase credentials and no production deployment has been performed. Configure database backups and retention in Supabase and keep the deployment and database regions, access, and recovery plans under the business owner’s control.

## Owner-supplied launch details still needed

- Complete, current menu with verified PHP prices, options, and product photos.
- Confirmed hours, contact channels, social links, and exact map pin/address.
- Whether pickup, delivery, or both are offered; delivery areas, fees, and minimums.
- Actual reservation types, slot schedule, capacity, and cancellation rules.
- Final owner-approved privacy, terms, refund, ordering, and reservation policies.
- PayMongo account approval, enabled payment channels, test and live keys, webhook secrets, and tested reconciliation/refund processes if online payment is required.
- Production domain and Supabase project access for deployment and live integration.


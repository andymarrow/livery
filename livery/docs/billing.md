# Billing (Polar)

Livery is free by default. Pro exists for heavy use: more builds an hour, bigger
tastes, private tastes and multi-page kits, and more extension pages an hour.
Polar (polar.sh) is the merchant of record: it runs checkout, invoices and tax.

## What the admin controls (`/admin/billing`)

- **Payments on/off.** Off by default. While off:
  - nobody can check out;
  - nobody sees a Pro prompt;
  - Pricing is hidden from the footer and sitemap, and `/pricing` is `noindex`.
- **Limits per plan** (visitors, Free, Pro):
  - builds an hour;
  - extension pages an hour;
  - sites per taste (2–12);
  - whether private tastes and multi-page kits are allowed.
  - The limits apply whether payments are on or off.
- **Prices shown** on `/pricing`. What people are actually charged is the price
  on the Polar products. Keep the two the same.
- **Give Pro by hand** from a user's row in Users ("Give Pro" / "Remove Pro").
  Pro given by hand never expires and isn't touched by Polar. Someone paying
  through Polar can only be cancelled in Polar.

Settings live in `public.app_settings` (key `billing`). Plans live in
`public.subscriptions`. Both come from
`supabase/migrations/20261009100000_plans.sql`.

## Setting up Polar (once approved)

1. **Test in the sandbox first**, at sandbox.polar.sh, with `POLAR_SERVER=sandbox`.
   Then repeat these steps on polar.sh for production.
2. **Products.** Create two recurring products:
   - "Livery Pro Monthly": $9.99, monthly;
   - "Livery Pro Yearly": $99, yearly.
   - Copy each product's ID.
3. **Access token.** Settings → Developers → New token (organization access
   token). Give it the scopes for checkouts, customers, customer sessions and
   subscriptions (read and write).
4. **Webhook.** Settings → Webhooks → Add endpoint:
   - URL: `https://www.livery.site/api/billing/webhook`;
   - format: Raw;
   - events: `subscription.created`, `subscription.updated`,
     `subscription.active`, `subscription.canceled`, `subscription.uncanceled`,
     `subscription.revoked`, `customer.state_changed` and `order.paid`;
   - copy the signing secret.
5. **Environment variables** in Vercel (Production), then redeploy:

   | Variable | Value |
   |---|---|
   | `POLAR_ACCESS_TOKEN` | the token from step 3 |
   | `POLAR_WEBHOOK_SECRET` | the secret from step 4 |
   | `POLAR_PRODUCT_PRO_MONTHLY` | monthly product ID |
   | `POLAR_PRODUCT_PRO_YEARLY` | yearly product ID |
   | `POLAR_SERVER` | `sandbox` while testing; remove it (or set `production`) when live |

6. **Check `/admin/billing`.** "Polar setup" should read Ready.
7. **Switch payments on** in `/admin/billing` and save.
8. **Buy Pro yourself to test** (with the sandbox test card while sandboxed):
   - you land on `/me?upgraded=1` with Pro;
   - the account appears under Pro accounts;
   - "Manage billing" opens Polar's portal.

## How it works

- **Checkout:** `/api/billing/checkout?interval=month|year` creates a Polar
  checkout tied to the signed-in user (`external_customer_id` = Livery user id).
  It only works when payments are on and Polar is configured.
- **Webhook:** `/api/billing/webhook` verifies the signature and re-reads the
  customer's state from Polar (`syncSubscription`). Events are never trusted
  on their own. The same sync runs on the `/me?upgraded=1` return, so Pro shows
  up even before the webhook arrives.
- **Lapsed subscriptions:** Pro ends two days after the paid period, as a grace
  period for renewals in flight.
- **Portal:** `/api/billing/portal` opens Polar's customer portal for
  cancelling, changing plan and invoices.

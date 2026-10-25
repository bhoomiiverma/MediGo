# MedDrop — Emergency Medical Supply Coordination Platform

MedDrop is a hackathon-ready MVP for coordinating emergency blood and medicine
across remote military outposts, medical camps, and disaster-relief centers.

It models the full workflow: shortage detection → emergency request → supplier
matching → inventory reservation → dispatch → in transit → delivery confirmation,
with persistent storage, role-based access control, real-time updates, and an
operations map.

## Stack

- Frontend: React + TypeScript + Vite
- Styling: Tailwind CSS + shadcn/ui-style primitives (Radix)
- Icons: Lucide React
- Maps: Leaflet + OpenStreetMap
- Backend/database: Supabase (PostgreSQL) with RLS and security-definer functions
- Auth: Supabase Auth
- Real-time: Supabase Realtime
- Forms: React Hook Form + Zod
- Charts: Recharts

## Demo mode (no credentials required)

If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not set (or contain
placeholders), the app runs in **demo mode**: an in-memory backend that behaves
identically to the real API, including simulated real-time broadcasts. A banner
at the top of the app states "DEMO MODE". Data resets on reload unless you use
the Reset Demo action.

Demo mode is clearly separated from the real backend in
`src/lib/demo-store.ts` (in-memory store), `src/lib/demo-mode.ts` (detection),
and `src/lib/api.ts` (unified client). No credentials are ever embedded in
frontend code.

### Demo accounts (password for all: `MedDrop123!`)

| Email | Role | Facility | Scenario |
|---|---|---|---|
| alpha@meddrop.demo | Requester | Outpost Alpha | Critical O-negative shortage |
| base@meddrop.demo | Supplier | Sector Base Hospital | 10 units O-negative in stock |
| bravo@meddrop.demo | Requester | Relief Camp Bravo | Mixed inventory |
| admin@meddrop.demo | Administrator | (all facilities) | Audit & oversight |

The login screen lists these accounts as one-click buttons.

## Three-minute demonstration

**Minute 1 — Identify the emergency** — Sign in as `alpha@meddrop.demo`. The
dashboard shows the low-stock warning and zero O-negative blood at Outpost
Alpha. Create a Critical request for 2 units via "Request Emergency Supply".

**Minute 2 — Coordinate the response** — Sign in as `base@meddrop.demo`. The new
alert appears on the Incoming Alerts board without refreshing (simulated
real-time). View distance, available stock, and the map. Accept the request —
2 units are reserved atomically.

**Minute 3 — Complete the dispatch** — Dispatch the supplies. Inventory drops,
status becomes In Transit on both dashboards. Switch back to Outpost Alpha and
confirm delivery. The request moves to Delivered and the audit history records
the event.

Use **Reset Demo** (visible in demo mode only) to restore the seed state and
repeat the demonstration.

## Project structure

```
src/
  lib/            api.ts, demo-mode.ts, demo-store.ts, supabase.ts, utils.ts
  store/          auth.ts (Zustand session store)
  hooks/          use-toast.ts, use-realtime.ts
  types.ts        shared domain types
  components/ui/  accessible primitives (button, card, dialog, table, select, ...)
  components/layout/  sidebar, top bar, demo banner
  pages/          login, dashboard, inventory, request, alerts, map, dispatch, tracking, transactions
  router.tsx      route guards with role-based access
supabase/schema.sql   PostgreSQL schema, RLS policies, atomic functions, seed data
```

## Required environment variables (real backend)

| Variable | Purpose |
|---|---|
| VITE_SUPABASE_URL | Supabase project URL |
| VITE_SUPABASE_ANON_KEY | Supabase anon (public) key |

Set these in `.env` or your hosting provider. Never expose the service-role
key in frontend code.

## Database provisioning

Run `supabase/schema.sql` in the Supabase SQL editor. It creates:

- `facilities`, `profiles`, `supply_items`, `inventories`, `supply_requests`,
  `inventory_transactions`, `request_events`, `notifications`
- Row Level Security policies on every table
- Atomic security-definer functions: `accept_request`, `reject_request`,
  `cancel_request`, `dispatch_request`, `confirm_delivery` (reservation,
  dispatch, and delivery run with row locking so concurrent requests cannot
  over-allocate and inventory can never go negative)
- Seed data for Outpost Alpha, Sector Base Hospital, and Relief Camp Bravo

After creating auth users, set `profiles.facility_id` and `profiles.role` for
each user so role-based access works.

## Role-based access control

Enforced server-side (RLS + security-definer functions), not only by hiding
frontend controls:

- **Requester (outpost/camp):** create requests, cancel own pending requests,
  confirm delivery, view own facility's inventory and requests.
- **Supplier (base hospital):** accept/reject incoming requests, reserve and
  dispatch stock, update transit status.
- **Administrator:** read across all facilities, transactions, and audit
  events.

## Running locally

```bash
npm install            # install dependencies
npm run dev            # start dev server (http://localhost:5173)
npm run lint           # TypeScript check
npm run test           # vitest suite (demo-store workflows)
npm run build          # production build to dist/
npm run preview        # preview production build
```

No build step is required for demo mode.

## Deployment

The frontend is a static Vite build and deploys to Vercel, Netlify, Cloudflare
Pages, or any static host. Set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` in the host's environment settings. For a real backend,
apply `supabase/schema.sql` to your Supabase project.

Coordinates in the seed data are illustrative grid positions for local testing;
do not use real military facility coordinates or expose sensitive operational
locations in public deployments.

## Tests

`tests/demo.test.ts` covers the primary workflow end-to-end against the demo
store:

- demo authentication and role/facility binding
- request creation, supplier matching, and real-time-style notification
- rejection of unfulfillable requests
- atomic reservation and prevention of concurrent over-allocation
- stock-guarded acceptance and valid status transitions
- dispatch deducting inventory exactly once, with an inventory transaction
- cancellation, delivery confirmation, and audit events
- duplicate-submission suppression
- dashboard counts derived from persisted data
- repeatable demo reset

## Notes on simulated capabilities

In demo mode, authentication, persistence, and real-time synchronization are
simulated in-browser. Route visualization on the map shows illustrative
straight-line distance (labeled as such), not a verified road route. Blood
product quantities are planning figures only; clinical release and
compatibility remain subject to qualified medical protocols.

## License

MIT
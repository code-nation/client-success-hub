

## Plan: Client Portal Restructuring

### Summary
Four changes to the client portal: remove Dashboard, remove Knowledge Base, simplify Subscriptions to a Stripe portal link card, and rebuild Hours & Usage to show titled "Projects" with period drill-down (read-only, no rate/value fields).

### Database Migration
Add a `title` column to `hour_allocations` so periods can have a project name instead of just dates:
```sql
ALTER TABLE hour_allocations ADD COLUMN title text;
```

### Changes

#### 1. Navigation (`src/components/layout/DashboardLayout.tsx`)
- Remove "Dashboard" and "Knowledge Base" from `clientNavItems`
- Rename "Hours & Usage" to "Projects"
- Update the icon to `FolderKanban`
- Remaining items: Support Tickets, Projects, Subscriptions

#### 2. Routes (`src/App.tsx`)
- Remove `/client` (ClientDashboard) route -- redirect `/client` to `/client/tickets` instead
- Remove `/client/knowledge` route
- Remove `ClientDashboard` import
- Keep `/client/hours` and `/client/hours/:allocationId` routes

#### 3. Subscriptions (`src/pages/client/ClientSubscriptions.tsx`)
- Replace the entire page content with a single card containing:
  - A credit card icon and title "Billing & Subscription"
  - Description text: "Manage your subscription, update payment methods, and view invoices"
  - A "Manage Billing" button that opens the Stripe customer portal (keep existing `handleManageSubscription` logic)
- Remove subscription list rendering, loading states for subscription data

#### 4. Hours & Usage / Projects (`src/pages/client/ClientHours.tsx`)
- Rename heading to "Projects"
- Fetch all `hour_allocations` with the new `title` column
- Display each allocation as a card showing:
  - Title (fallback to date range if no title)
  - Date range
  - Progress bar (used / total hours)
  - Hours remaining
  - "Current" badge if dates encompass today
- Each card links to `/client/hours/:allocationId`

#### 5. Period Detail (`src/pages/client/ClientHoursPeriod.tsx`)
- Show allocation title as heading (fallback to date range)
- Show date range, progress bar, hours used/remaining
- Show time log entries: date, ticket title, description, hours (read-only)
- No edit buttons, no hourly rate, no value column

### Technical Details
- The `hour_allocations.title` column is nullable text; the UI falls back to the date range when null
- All data fetching uses existing RLS policies -- clients can already SELECT their own allocations and time logs
- The Stripe portal function (`customer-portal`) is already deployed and will be reused for the simplified subscriptions card


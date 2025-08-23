# Booking Charges & Payments — Implementation Plan

Status: Draft (2025-08-22)

## Objectives
Add normalized support for multiple charges (room, food, misc, discount, tax, adjustment) and multiple payments (including refunds) per booking. Integrate with web UI (`src/components/BookingDetails.tsx`), Telegram bot (`supabase/functions/telegram-bot/features/booking.ts`), and invoice rendering (`src/components/InvoiceTemplate.tsx`).

## Confirmed Business Rules
- Charge types: room, food, misc, discount, tax, adjustment.
- Taxes: Not needed (no automatic tax calc). Keep type for future.
- Discounts: flat and percentage per-line (primarily on room); no global discount required.
- Payments: modes = cash, upi, card, bank, other. No references/notes required. Backdating allowed via `paid_at`.
- Refunds: boolean flag; show on invoice similar to payments.
- Voids: soft-void flags on charges and payments; any admin can void.
- Totals: balance = sum(charges) − discounts + taxes − payments + refunds.
- Currency: INR, `numeric(10,2)` / `numeric(12,2)`.
- Invoice: show each charge line and each payment/refund line with date. Keep existing folio/invoice numbering.
- RLS: property-scoped access consistent with existing tables (e.g., `menu_items`, `expenses`).

## Database Design
New tables (normalized, property-scoped, linked to `bookings.id`). RLS mirrors existing property-based policies.

### booking_charges
- id uuid PK
- property_id uuid NOT NULL
- booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE
- type text CHECK (type IN ('room','food','misc','discount','tax','adjustment'))
- menu_item_id uuid NULL REFERENCES menu_items(id) ON DELETE SET NULL
- description text
- quantity numeric(10,2) NOT NULL DEFAULT 1
- unit_price numeric(10,2) NOT NULL DEFAULT 0
- line_total numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
- discount_percent numeric(5,2) NULL DEFAULT 0 -- optional per-line percent
- discount_amount numeric(12,2) NULL DEFAULT 0 -- optional per-line flat
- currency text DEFAULT 'INR'
- is_voided boolean NOT NULL DEFAULT false
- created_by uuid NULL, created_at timestamptz DEFAULT now()
- updated_at timestamptz DEFAULT now()
- Indexes: (booking_id), (property_id, booking_id), partial index on NOT is_voided

Notes:
- For discount handling, either use `type='discount'` lines OR the per-line `discount_*` fields on charge lines. UI will prefer per-line discount for room charges; `type='discount'` remains available for ad-hoc lines (amount negative or explicit type-based accounting).

### booking_payments
- id uuid PK
- property_id uuid NOT NULL
- booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE
- amount numeric(12,2) NOT NULL CHECK (amount >= 0)
- mode text CHECK (mode IN ('cash','upi','card','bank','other'))
- paid_at timestamptz NOT NULL DEFAULT now()
- is_refund boolean NOT NULL DEFAULT false
- is_voided boolean NOT NULL DEFAULT false
- created_by uuid NULL, created_at timestamptz DEFAULT now()
- updated_at timestamptz DEFAULT now()
- Indexes: (booking_id), (property_id, booking_id), partial index on NOT is_voided

### Derived totals view: booking_financials
A read-only view that returns per-booking aggregates for UI, invoices, and bot.
- charges_total: sum of non-voided positive charge lines after line-level discounts
  - Effective per-line total = line_total - discount_amount - (line_total * discount_percent/100)
  - Exclude `type='discount'` if we strictly use per-line discounts; if `type='discount'` used, treat as negative in discounts_total.
- discounts_total: sum of discount lines (type='discount') + per-line discounts (if we choose to report separately)
- taxes_total: sum of tax lines (type='tax') — currently likely zero
- gross_total = charges_total + taxes_total − discounts_total
- payments_total: sum of non-voided payments where is_refund=false
- refunds_total: sum of non-voided payments where is_refund=true
- balance_due = gross_total − payments_total + refunds_total
- status_derived: paid | partial | unpaid

### Backwards compatibility
- Keep `bookings.payment_amount` and `payment_mode` for now; deprecate editing from UI. Optionally backfill them from aggregates for legacy views if any.

### Migrations (outline)
- File: `migrations/booking_charges_payments_migration.sql`
  - Create tables, indexes, updated_at triggers.
  - Create RLS policies: insert/select/update/delete where `property_id` matches user’s allowed scope.
  - Create `booking_financials` view.
- Update docs in `README.md` about running the migration.

## RLS Policies
Follow the existing pattern (see `menu_management_migration.sql`, `expenses_rls_*`):
- `WITH CHECK` and `USING` ensure row `property_id` matches current user’s property scope.
- Separate policies for select/insert/update/delete.
- Enable RLS on both tables.

## Web App Integration
Files to modify/create:
- `src/services/bookingChargesService.ts` (new)
- `src/services/bookingPaymentsService.ts` (new)
- `src/components/BookingDetails.tsx` (extend UI)
- `src/components/InvoiceTemplate.tsx` (extend invoice)

### BookingDetails UI
- Charges section:
  - Add Food charge: typeahead (uses `menuService.searchMenuItems` by name & `property_id`), qty, unit price (prefilled), optional description override, optional discount fields (percent/amount).
  - Add Misc charge: description, qty, unit price, optional discount fields.
  - Table: columns (type, description, qty, unit, per-line discount, effective total, created_at). Actions: edit, void.
- Payments section:
  - Add Payment: amount, mode, paid_at (allow backdate).
  - Add Refund: amount, mode, paid_at (is_refund=true).
  - Table: columns (amount, mode, paid_at, type=payment/refund). Actions: void.
- Summary panel:
  - charges_total, discounts_total, taxes_total, gross_total, payments_total, refunds_total, balance_due.
- Disable editing legacy booking `payment_amount`/`payment_mode` in this view.

### Services
- `bookingChargesService.ts`:
  - listByBooking(bookingId)
  - createFoodCharge({ bookingId, propertyId, menuItemId, description?, quantity, unitPrice, discountPercent?, discountAmount? })
  - createMiscCharge({...})
  - update(id, patch)
  - void(id)
- `bookingPaymentsService.ts`:
  - listByBooking(bookingId)
  - addPayment({ bookingId, propertyId, amount, mode, paidAt? })
  - addRefund({ ...same, isRefund: true })
  - void(id)

## Telegram Bot Integration
- File: `supabase/functions/telegram-bot/features/booking.ts`
- Booking summary: include totals and balance_due from `booking_financials`.
- Buttons:
  - ➕ Add Charge → wizard (Food vs Misc) → item/name → qty → unit price → discount? → confirm → save.
  - 💳 Add Payment → amount → mode (inline buttons) → paid_at (optional) → confirm → save.
  - 🧾 View Charges → list recent, pagination, inline “Void”.
  - 💰 View Payments → list recent, pagination, inline “Void”.
- All actions check property scope and booking existence. After mutation, refresh summary.

## Invoice Changes
- `src/components/InvoiceTemplate.tsx`:
  - Render detailed charge lines with effective totals after per-line discounts.
  - Render payments and refunds list (date, mode, amount).
  - Show summary totals: charges, discounts, taxes, gross, payments, refunds, balance due.
  - Maintain current folio/invoice numbering via `invoice_counter` and existing booking fields.

## Testing
- DB: migration applies cleanly; RLS policies behave as expected.
- Services: unit tests for happy-path, invalid property, void semantics.
- UI: add/edit/void charge; add/refund/void payment; summary updates; invoice renders correctly.
- Bot: wizard flows, pagination, void actions.

## Rollout
- Phase 1: DB + services + hidden UI tab for internal testing.
- Phase 2: Enable UI sections + invoice changes.
- Phase 3: Telegram flows.

## Risks & Mitigations
- Data drift with legacy fields → derive and stop editing legacy fields; consider migration scripts for historical invoices if needed.
- RLS mistakes → mirror proven policies from `menu_items`/`expenses`, add tests.
- UX complexity → progressive disclosure (modals), concise defaults.

## Change Log
- 2025-08-22: Initial draft created.

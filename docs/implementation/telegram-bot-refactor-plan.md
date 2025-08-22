# Telegram Bot Refactor Plan (Supabase Edge / grammY)

Status: Draft (Phase 1 started)
Date: 2025-08-21
Owner: Telegram Bot Module
Paths: `supabase/functions/telegram-bot/index.ts`

## Goals
- Maintainability: split oversized `index.ts` (~1,600 lines) into cohesive modules.
- Safety: no behavior changes in Phase 1–2; refactor only.
- Velocity: make adding stories 6.4–6.6 faster and safer.
- Testability: isolate pure utilities and DB services for unit tests.

## Current State (Summary)
- `index.ts` mixes env/config, bot wiring, middleware, DB helpers, wizard state, feature handlers (property switch, bookings quick actions, booking search/modify), UI keyboards, and the webhook server.
- A single callback handler branches on multiple prefixes: `prop:`, `checkin:`/`checkout:`, `room:`, `wiz_*`, `booking:search:*`, `booking_date:`, and `bk:*`.

## Target Module Structure (Incremental)
- `supabase/functions/telegram-bot/index.ts`
  - Env/config, Supabase client
  - Bot creation and command registration
  - Global middleware wiring
  - Register feature modules
  - Webhook `Deno.serve`

- `supabase/functions/telegram-bot/utils.ts` (Phase 1)
  - Pure helpers: `parseAdultChild`, `composeAdultChild`, `formatDateInTZ`, `generateCalendarKeyboard`, `genToken`

- `supabase/functions/telegram-bot/state/wizard.ts` (Phase 2)
  - `type WizardStep`, `type WizardData`
  - `loadWizard`, `saveWizard`, `clearWizard`
  - Design: accept `SupabaseClient` via parameter to avoid hard coupling

- `supabase/functions/telegram-bot/services/bookings.ts` (Phase 2–3)
  - `loadBookingById`, `getAvailableRooms`, `getRoomMaxOccupancy`

- `supabase/functions/telegram-bot/services/properties.ts` (Phase 2–3)
  - `getActiveProperties`, `loadLastPropertyId`, `saveLastPropertyId`

- `supabase/functions/telegram-bot/features/core.ts` (Phase 3)
  - `/start`, `/ping`, `/commands`, `/refresh_commands`, `/switch` + `prop:` callback

- `supabase/functions/telegram-bot/features/booking.ts` (Phase 3)
  - `/book` wizard, `/booking` search
  - Callback handlers for `room:`, `wiz_*`, `booking:search:*`, `booking_date:`, `bk:*`

Optional (later):
- `supabase/functions/telegram-bot/ui/keyboards.ts` (calendar & pickers)
- A small callback router utility

## Phased Plan
- Phase 1 (started)
  - Extract pure utilities to `utils.ts`.
  - Update `index.ts` imports; remove duplicate in-file functions.
  - No behavior changes.

- Phase 2
  - Extract wizard state to `state/wizard.ts` and services to `services/`.
  - Pass `supabase` as dependency.
  - Update imports and call sites.

- Phase 3
  - Extract feature handlers (`features/core.ts`, `features/booking.ts`).
  - `index.ts` registers these via `register*(bot, deps)` pattern.

- Phase 4 (post-refactor polish)
  - Optionally add a callback router and stronger typing of callback payloads.
  - Add unit tests for utilities/services.

## Done Criteria (per phase)
- All imports build under Deno in Supabase Edge.
- No change in runtime behavior verified by manual smoke test:
  - `/start`, `/ping`, `/commands`, `/refresh_commands`, `/switch`
  - `/book` flow incl. calendars, room/adult/children pickers, confirm/cancel
  - `/booking` search by name/date/recent, show/modify/cancel

## Risk & Mitigation
- Risk: Hidden coupling to env values in utility defaults.
  - Mitigate by passing timezone explicitly where used; keep safe defaults in utils.
- Risk: Missed call-site updates when extracting services/state.
  - Mitigate by incremental phases and targeted grep.

## Rollback Plan
- Keep changes in small commits. If issues arise, revert the last phase without affecting others.

## Mapping (initial)
- Move from `index.ts` to `utils.ts`:
  - `parseAdultChild`, `composeAdultChild`, `formatDateInTZ`, `generateCalendarKeyboard`, `genToken`

- Later moves in Phase 2–3 as listed above.

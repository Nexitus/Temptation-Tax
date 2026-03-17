# Feature: Weekly Review
**Category:** Core
**Status:** ✅ Built
**Source:** `src/components/weekly-review.js`
**Last Updated:** 2026-03-17

---

## Analyst — Brief
> *Why does this exist? What problem does it solve? Who does it serve?*

- **Problem Statement:** Logging temptations only has value if they translate into real savings. Users need a ritual — a weekly settlement moment where they commit their accumulated tax to their HISA, making the discipline tangible and permanent.
- **User:** A user who has logged one or more temptations and is ready to "pay themselves" by confirming a deposit.
- **Goal:** Create a deliberate, weighted moment where the user reviews what they logged and commits to transferring the tax amount to savings.
- **Success looks like:** A user sees all their week's temptations, reviews the total, and clicks "Confirm Deposit" — triggering an atomic write that records the deposit and clears the list, followed by confetti.

---

## PM — Product Requirements
> *What does it do from the user's perspective?*

### User Stories
- As a user, I want to see all temptations I logged this week so that I can review them before confirming a deposit.
- As a user, I want to navigate to previous weeks so that I can review or confirm past undeposited temptations.
- As a user, I want to see items carried over from previous weeks so that nothing slips through the cracks.
- As a user, I want to delete individual temptation items so that I can correct mistakes before confirming.
- As a user, I want to confirm my deposit so that the tax amount is committed and the list is cleared.

### Acceptance Criteria
- [ ] Current week's temptations are displayed with item name, price, tax amount, and status badge (Resisted/Purchased)
- [ ] Week navigation (← →) allows browsing past weeks; forward navigation is disabled at current week
- [ ] Week header shows human-readable label ("This Week", "Last Week", "2 Weeks Ago") and date range
- [ ] Unconfirmed items from past weeks appear in a "Carried Over" section when viewing current week
- [ ] Total tax owed reflects only the currently viewed week (carried-over total shown separately)
- [ ] "Confirm Deposit to HISA" button is disabled when no items exist
- [ ] Confirmation requires a browser `confirm()` dialog showing the deposit amount
- [ ] Delete button removes individual items; disabled while item is in optimistic (temp) state
- [ ] On successful deposit confirmation, the list clears and confetti fires

### Out of Scope
- Partial deposit confirmation (all items in view are confirmed together)
- Editing an existing temptation's name or price (delete + re-add)
- Per-item notes or categories

---

## Architect — Technical Design
> *How is it built? What decisions were made and why?*

- **Pattern:** Stateless render function — all week state (`weekOffset`) lives in `main.js`. Component re-renders fully on state change.
- **Key Dependencies:** `getWeekIdForOffset`, `getWeekRangeDisplayForOffset`, `getWeekLabel`, `formatCurrency` (week-helpers.js)
- **Data Flow:**
  1. `renderWeeklyReview(container, temptations, settings, onConfirm, onDelete, state)` receives all data as props
  2. Filters `temptations` array by `weekId === currentWeekId` for the active week
  3. When `weekOffset === 0`, also computes `carriedOverTemptations` (items where `weekId < currentWeekId`)
  4. "Confirm Deposit" calls `onConfirm(totalConfirmTax, itemsToConfirm)` → `processConfirmation()` in Firestore (atomic batch)
  5. Week navigation calls `state.handleNavigateWeek(offset)` which updates `state.weekOffset` in `main.js` and re-renders
- **Design Decisions:**
  - Carry-over items are only shown when viewing the current week (`weekOffset === 0`) to avoid confusion — you confirm everything now, including the past
  - `totalConfirmTax` when `weekOffset === 0` includes both current week and carry-over; when viewing a past week it's that week's total only
  - Optimistic items (temp IDs starting with `temp-`) have their delete button disabled to prevent race conditions

---

## Developer — Implementation Notes
> *How was it actually implemented? What should a dev know?*

- **Entry Point:** `src/components/weekly-review.js` → `renderWeeklyReview()`
- **Key Functions:**
  - `renderWeeklyReview()` — full imperative render; event listeners re-attached after each render
  - `getTax(t)` — local helper with backward-compatibility fallback for items missing `taxAmount` field
  - `isPastWeek(id)` — compares week ID strings to determine carry-over eligibility
- **Edge Cases Handled:**
  - `getTax()` falls back to `price × settings.taxRate` for items created before `taxAmount` was introduced to the data model
  - Next-week button is HTML-disabled (`disabled` attribute) when `weekOffset >= 0` — no future navigation
  - Delete button disabled + `title="Saving..."` while item has a `temp-` prefixed ID (still being written to Firestore)
  - Confirm button disabled (`itemsToConfirm.length === 0`) when there's nothing to confirm
- **Known Limitations:**
  - Full re-render on every state change (no diffing) — fine at current data volumes, but could flicker if temptation lists grow large
  - Browser `confirm()` dialog is not styleable; a custom modal would improve the premium feel

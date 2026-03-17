# Feature: Compound Interest Engine
**Category:** Infrastructure
**Status:** ✅ Built
**Source:** `src/utils/compound-interest.js`
**Last Updated:** 2026-03-17

---

## Analyst — Brief
> *Why does this exist? What problem does it solve? Who does it serve?*

- **Problem Statement:** Showing users only their principal balance dramatically undersells the value of their discipline. Compound interest — even at modest HISA rates — meaningfully grows savings over time, and users deserve to see that growth. Without it, the app is just a ledger.
- **User:** Internal — called by `main.js` and `savings-dashboard.js` to derive interest earned from confirmed deposits.
- **Goal:** Accurately calculate how much interest each deposit has earned since it was confirmed, accounting for the interest rate that was in effect at the time.
- **Success looks like:** A user who confirmed a $200 deposit 6 months ago at 4.5% sees a small but real interest gain on their dashboard — reinforcing that their savings are actively working.

---

## PM — Product Requirements
> *What does it do from the user's perspective?*

### User Stories
- As the app, I need to calculate total interest earned across all deposits so that the dashboard can display "Estimated Interest" accurately.
- As the app, I need to use the interest rate that was active at the time of each deposit so that historical calculations remain stable when settings change.

### Acceptance Criteria
- [ ] Returns `0` for empty or missing deposits array
- [ ] Calculates compound interest for each deposit independently using its locked-in rate
- [ ] Uses weekly compounding (`n = 52`) consistent with how HISA rates compound in practice
- [ ] `weeksElapsed` is floored (not rounded) — partial weeks do not earn interest
- [ ] Deposits with `weeksElapsed === 0` earn no interest (same-week deposit has not yet compounded)
- [ ] Total returned is the sum of interest earned (not future value) across all deposits

### Out of Scope
- Daily or monthly compounding variants
- Inflation adjustment
- Tax on interest earned

---

## Architect — Technical Design
> *How is it built? What decisions were made and why?*

- **Pattern:** Pure function — no side effects, no DOM, no Firebase. Takes an array of deposit objects and an annual rate fallback; returns a number.
- **Key Dependencies:** None (pure JS math)
- **Formula:** `A = P(1 + r/52)^weeksElapsed` where:
  - `P` = deposit amount
  - `r` = annual rate (from `deposit.interestRate` or fallback `annualRate`)
  - `weeksElapsed` = `Math.floor((now - depositDate) / msPerWeek)`
  - Interest earned = `A - P`
- **Data Flow:**
  1. Called with `state.deposits` and `state.settings.interestRate`
  2. Iterates each deposit, reads `deposit.interestRate` (rate locked at confirmation time)
  3. Computes weeks elapsed since `deposit.confirmedAt`
  4. Applies formula; accumulates interest
  5. Returns total interest as a float
- **Design Decisions:**
  - Rate locking (`deposit.interestRate !== undefined ? deposit.interestRate : annualRate`) is the critical design decision — it means changing your HISA rate in settings today does not retroactively change interest calculated on deposits made at a different rate
  - `Math.floor` for weeks prevents overstating interest (conservative, matches real HISA behavior)
  - Weekly compounding chosen as the standard since most HISAs compound daily or monthly, but weekly is a reasonable approximation that keeps the math simple

---

## Developer — Implementation Notes
> *How was it actually implemented? What should a dev know?*

- **Entry Point:** `src/utils/compound-interest.js` → `calculateCompoundInterest(deposits, annualRate)`
- **Key Functions:**
  - `calculateCompoundInterest(deposits, annualRate)` — the single exported function; pure, synchronous
- **Edge Cases Handled:**
  - `!deposits || deposits.length === 0` → returns `0` early; safe for empty state
  - `deposit.interestRate !== undefined` check (not truthiness) — handles the case where `interestRate` is `0` (zero percent HISA), which is falsy but valid
  - `Math.max(0, now - depositDate)` prevents negative time differences from clock skew or bad timestamps
- **Known Limitations:**
  - Assumes `deposit.confirmedAt` is a parseable ISO 8601 string — no validation or error handling for malformed dates
  - Weekly compounding is an approximation; actual HISA compounding is typically daily
  - No caching — recalculated from scratch on every call; fine at current data volumes

# Feature: Confetti Celebration
**Category:** Infrastructure
**Status:** ✅ Built
**Source:** `src/main.js` (inside `handleConfirmDeposit`)
**Last Updated:** 2026-03-17

---

## Analyst — Brief
> *Why does this exist? What problem does it solve? Who does it serve?*

- **Problem Statement:** Resisting the urge to spend is hard, invisible work. Confirming a deposit to savings is an act of discipline that deserves recognition. Without a moment of delight, the app feels transactional — just another financial tool. Confetti transforms a database write into a celebration.
- **User:** Any authenticated user who successfully confirms a deposit.
- **Goal:** Create a micro-moment of joy that makes "not spending" feel as satisfying as spending. This is the app's primary emotional reward loop.
- **Success looks like:** The user clicks "Confirm Deposit", sees a toast, and is immediately surprised by a burst of confetti in the app's brand colors — making the experience feel like a win.

---

## PM — Product Requirements
> *What does it do from the user's perspective?*

### User Stories
- As a user, I want to see a celebratory visual effect when I confirm a deposit so that my discipline feels rewarded and worth repeating.

### Acceptance Criteria
- [ ] Confetti fires only after `processConfirmation` resolves successfully (not on failure)
- [ ] Confetti uses brand colors: `#00ff88` (primary green), `#ffffff` (white), `#7864ff` (secondary purple)
- [ ] Particle count: 150 — dense enough to feel celebratory without being overwhelming
- [ ] Spread: 70 degrees — wide enough to fill the viewport
- [ ] Origin: `{ y: 0.6 }` — launches from slightly below center, arcing upward naturally
- [ ] No confetti fires on failed deposits or network errors

### Out of Scope
- Sound effects
- Custom confetti shapes
- Confetti on other actions (only deposit confirmation triggers this)

---

## Architect — Technical Design
> *How is it built? What decisions were made and why?*

- **Pattern:** Single `confetti()` call in the success path of `handleConfirmDeposit`. No abstraction layer — the behavior is intentionally simple and contextual.
- **Key Dependencies:** `canvas-confetti` npm package
- **Data Flow:**
  1. User clicks "Confirm Deposit" → `handleConfirmDeposit(amount, items)` called
  2. `processConfirmation()` awaits Firestore atomic write
  3. On success → `showToast('Deposit confirmed! Future you thanks you.', 'success')`
  4. `confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: [...] })` fires
  5. On error → `showToast('Failed to confirm deposit.', 'error')` — no confetti
- **Design Decisions:**
  - Confetti fires after `showToast` (not before) so the user's attention is on the toast first, then the screen fills with confetti
  - Brand colors chosen deliberately: the primary green (`#00ff88`) matches `--primary-color`, white is neutral and celebratory, purple (`#7864ff`) matches `--secondary-color`
  - `y: 0.6` origin (below center) creates an upward arc that feels like fireworks launching from below — more dramatic than center-origin
  - Not abstracted into a utility function because it's called in exactly one place; abstraction would add complexity with no benefit (YAGNI)

---

## Developer — Implementation Notes
> *How was it actually implemented? What should a dev know?*

- **Entry Point:** `src/main.js` → `handleConfirmDeposit()`, line ~183
- **Key Functions:**
  - `handleConfirmDeposit(amount, items)` — async handler; confetti is the last statement in the try block
- **Edge Cases Handled:**
  - Confetti is inside the `try` block, after `await processConfirmation()` — guaranteed to only fire on successful writes
  - `canvas-confetti` is fire-and-forget; it does not return a promise and does not affect the async flow
- **Known Limitations:**
  - `canvas-confetti` creates a full-viewport canvas overlay briefly — on very low-end devices this could cause a frame drop
  - If `processConfirmation` succeeds but the subsequent Firestore listener update is slow, the user sees confetti before the list clears — a brief moment of visual inconsistency
  - No way to disable confetti (e.g. for users with motion sensitivity preferences) — `prefers-reduced-motion` media query is not checked

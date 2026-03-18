# Temptation Tax — Development Plan
**Prepared:** 2026-03-18
**Basis:** Product analysis + technical architecture review + 6 BMAD feature specs

---

## Executive Summary

The core loop is solid. The data model is sound. The aesthetic is strong. The next phase of development closes the gap between the brand's premium promise and a handful of rough edges (the native confirm dialog, the misleading streak, the leaky anonymous funnel), then deepens the weekly ritual into something genuinely reflective and motivating.

**Six features. Three sprints. Twelve weeks.**

---

## Sprint 1 — Trust & Polish
**Goal:** Close the gaps that undercut the premium experience on every cycle. These are quick wins with high visibility. Every user who confirms a deposit this sprint will notice the difference.

**Duration:** ~2–3 weeks

---

### Task 1.1 — Custom Deposit Confirmation Modal
**Spec:** [`docs/features/core/deposit-confirmation-modal.md`](features/core/deposit-confirmation-modal.md)
**Files touched:** `src/components/weekly-review.js`, `src/styles/components.css`
**Effort:** Small (1–2 days)

**What to build:**
- Define a local async function `showConfirmModal(amount, items, currency)` inside `weekly-review.js`
- It appends a `<div class="modal-overlay">` to `document.body` and returns a Promise
- Modal content: formatted deposit amount (large), item count, up to 5 item names (truncated with "+ N more"), Cancel + Confirm buttons
- Confirm button: green primary, loading state ("Processing...") while `onConfirm` awaits
- Cancel + Escape key: resolves `false`, removes overlay
- Enter key: resolves `true` (confirm)
- Replace the existing `if (confirm(...))` on `weekly-review.js:144` with `const confirmed = await showConfirmModal(...)`

**CSS to add in `components.css`:**
```css
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-box { /* extends .glass-card */ max-width: 420px; width: 90%; padding: 2rem; }
```

**Acceptance check:** Clicking "Confirm Deposit to HISA" shows the custom modal. Enter confirms. Escape cancels. No `window.confirm()` ever fires.

---

### Task 1.2 — Temptation Editing
**Spec:** [`docs/features/core/temptation-editing.md`](features/core/temptation-editing.md)
**Files touched:** `src/firebase/db-service.js`, `src/main.js`, `src/components/weekly-review.js`
**Effort:** Small–Medium (2–3 days)

**What to build:**

Step 1 — Add `updateTemptation` to `db-service.js`:
```js
import { updateDoc } from 'firebase/firestore';

export async function updateTemptation(uid, itemId, updates) {
    return updateDoc(doc(db, `users/${uid}/temptations`, itemId), updates);
}
```

Step 2 — Add `handleUpdateTemptation` to `main.js` (same pattern as `handleDeleteTemptation`):
```js
async function handleUpdateTemptation(itemId, updates) {
  if (!state.user) return;
  try {
    await updateTemptation(state.user.uid, itemId, updates);
    showToast('Temptation updated', 'success');
  } catch (err) {
    showToast('Failed to update.', 'error');
  }
}
```
Pass `handleUpdateTemptation` into `renderWeeklyReview` alongside `handleDeleteTemptation`.

Step 3 — In `weekly-review.js`:
- Declare `const editingIds = new Set()` at module scope
- Per item row: add a pencil icon button (`data-id`, disabled if `id.startsWith('temp-')`)
- When `editingIds.has(t.id)`, render an inline form instead of the display row (name input, price input, purchased checkbox, Save + Cancel buttons)
- Tax preview: live-computed from `price * (purchased ? settings.purchaseTaxRate : settings.taxRate)`, updated on `input` event
- Save → call `onUpdate(t.id, { name, price, purchased, taxAmount })` → `editingIds.delete(t.id)` on success
- Cancel → `editingIds.delete(t.id)` → local re-render

**Acceptance check:** Clicking a pencil icon turns a row into an editable form. Price change updates tax preview live. Save writes to Firestore and collapses the form. Items with `temp-` IDs show a disabled pencil.

---

## Sprint 2 — Behavioral Integrity
**Goal:** Fix the two metrics that undermine user trust (streak and data loss), and make the habit loop structurally sound. These are reliability investments that become more valuable as the user base grows.

**Duration:** ~3–4 weeks

---

### Task 2.1 — True Consecutive-Week Streak
**Spec:** [`docs/features/core/streak-tracking.md`](features/core/streak-tracking.md)
**Files touched:** `src/utils/streak-calculator.js` (new), `src/main.js`, `src/components/stats-bar.js`
**Effort:** Small–Medium (2–3 days)

**What to build:**

Step 1 — Create `src/utils/streak-calculator.js`:
- `dateToWeekId(date)` — converts a Date to ISO week ID string (same logic as `week-helpers.js`)
- `calculateStreak(deposits)` — returns `{ currentStreak, longestStreak }`:
  1. Map deposits to week IDs via `dateToWeekId(new Date(d.confirmedAt))`
  2. Deduplicate and sort descending
  3. Allow streak if most recent week is current week or last week
  4. Walk backward counting consecutive weeks until gap

Step 2 — Update `main.js`:
- Add `state.lastMilestoneReached = 0` to initial state
- In `updateOverallStats()`: import and call `calculateStreak(state.deposits)`
- Replace `streak: totalDeposits` → `streak: currentStreak` in `renderStatsBar` call
- Milestone check against `[4, 8, 12, 26, 52]` thresholds; fire `showToast` on new milestones

Step 3 — Update `stats-bar.js`:
- Change streak display from `${stats.streak}🔥` → `${stats.streak}-week streak 🔥`

**Acceptance check:** A user with 4 deposits in 4 consecutive weeks shows "4-week streak 🔥". If they have deposits in weeks 1, 2, 4 (skipped week 3), they show "1-week streak". Deposit count no longer appears.

---

### Task 2.2 — Anonymous-to-Google Data Migration
**Spec:** [`docs/features/core/anon-to-google-migration.md`](features/core/anon-to-google-migration.md)
**Files touched:** `src/main.js`, `src/firebase/db-service.js`
**Effort:** Medium (3–4 days)

**What to build:**

Step 1 — Add `migrateAnonymousData(anonUid, googleUid)` to `db-service.js`:
- `getDocs` for temptations and deposits under `anonUid`
- `addDoc` each into `googleUid` collections
- `getDoc` for anonymous settings; `setDoc` to Google path only if Google user has no settings yet
- Batch-delete all anonymous docs (chunked ≤500, same pattern as `resetData`)
- Return Promise; reject without deleting if any copy step fails

Step 2 — Rewrite `handleSignIn()` in `main.js`:
```js
async function handleSignIn() {
  try {
    const anonUid = state.user?.isAnonymous ? state.user.uid : null;
    if (anonUid) {
      try {
        await linkWithPopup(auth.currentUser, googleProvider);
        const googleUid = auth.currentUser.uid;
        showToast('Saving your data...', 'info');
        await migrateAnonymousData(anonUid, googleUid);
        showToast('Data saved to your Google account ✓', 'success');
      } catch (linkErr) {
        if (linkErr.code === 'auth/credential-already-in-use') {
          await signInWithPopup(auth, googleProvider);
          showToast('Signed in — anonymous data was not merged.', 'warning');
        } else { throw linkErr; }
      }
    } else {
      await signInWithPopup(auth, googleProvider);
    }
  } catch (err) {
    console.error(err);
    showToast('Login failed.', 'error');
  }
}
```

**Critical:** Capture `anonUid` **before** any auth call. After `linkWithPopup`, `auth.currentUser.uid` is already the Google UID.

**Acceptance check:** Anonymous user with 10 temptations clicks "Login for Sync," signs in with Google, and sees all 10 temptations intact. Signing in from scratch (no anonymous data) works identically to before.

---

## Sprint 3 — Depth & Motivation
**Goal:** Transform the weekly deposit ritual from transactional to reflective, and give users a personal destination for their savings. These features are the "why" behind the discipline.

**Duration:** ~3–4 weeks

---

### Task 3.1 — Weekly Insights Card
**Spec:** [`docs/features/core/weekly-insights-card.md`](features/core/weekly-insights-card.md)
**Files touched:** `src/components/weekly-review.js`, `src/main.js`
**Effort:** Small–Medium (2–3 days)

**What to build:**

Step 1 — Add `computeWeeklyInsights(weekItems, allDeposits)` inside `weekly-review.js`:
- Compute: `resistedCount`, `purchasedCount`, `resistRate`, `resistedAmount`, `purchasedAmount`
- Find previous deposit (most recent `allDeposits` entry by `confirmedAt`), compute `prevResistRate` from its `items[]`
- Return delta percentage: `resistRate - prevResistRate` (null if no prior deposit)

Step 2 — Update `renderWeeklyReview` signature to accept `allDeposits` as a fifth argument. Update call in `main.js` to pass `state.deposits`.

Step 3 — Render insights card HTML between the carryover section and "Total to Deposit" row. Only when `itemsToConfirm.length > 0`. Card should show:
- "You resisted N of M temptations (X%)"
- "+ $X.xx saved | − $X.xx given in"
- Delta line: green ↑ or muted ↓ or first-deposit message

**Acceptance check:** Opening the weekly review when items exist shows the insights card above the confirm button. First deposit shows "Your first deposit — the habit starts now." Subsequent deposits show week-over-week comparison.

---

### Task 3.2 — Savings Goal & Milestone Targets
**Spec:** [`docs/features/core/savings-goal.md`](features/core/savings-goal.md)
**Files touched:** `src/components/settings-panel.js`, `src/components/savings-dashboard.js`, `src/main.js`
**Effort:** Medium (3–4 days)

**What to build:**

Step 1 — Add "Savings Goal" input to `settings-panel.js`:
- Numeric field after interest rate, before reset button
- On change: `onUpdate({ savingsGoal: parseFloat(val) || null })`
- Display with currency prefix matching `settings.currency`

Step 2 — Add `goalLinePlugin` to `savings-dashboard.js`:
- Custom Chart.js afterDraw plugin (same pattern as `todayAnnotationPlugin`)
- Draws a dashed horizontal line at `savingsGoal` value on the Y axis
- Labels it "GOAL $X,XXX" using gold/amber color (`rgba(255, 220, 100, 0.8)`)
- Skips render if `!savingsGoal` or `savingsGoal <= currentBalance`
- Register in chart's `plugins` array alongside existing plugins

Step 3 — Add "Progress to Goal" stat to the dashboard summary grid (conditional on `savingsGoal > 0`):
- `XX% to goal` with `$current / $goal` subtitle

Step 4 — Milestone logic in `main.js`:
- Add `state.milestoneReached = new Set()` to initial state
- In `updateOverallStats()`, after computing `currentBalance`:
  - Check `[0.25, 0.5, 0.75]` thresholds → `showToast` with milestone message
  - Check `1.0` threshold → `showToast` + `confetti()` with goal-reached colors
  - Only fire if threshold not in `state.milestoneReached`; add to Set after firing

**Acceptance check:** Setting a goal of $1,000 with $600 current balance shows "60% to goal" and a dashed goal line on the chart. At $250 savings (25%), a toast fires. At $1,000, confetti fires.

---

## Technical Debt to Address (Bundle with Sprint 1)

These are small fixes identified by the architecture review. They don't need their own specs — bundle them into Sprint 1 alongside Task 1.1 and 1.2.

| Debt Item | File | Fix | Effort |
|---|---|---|---|
| Ghost `document.addEventListener` | `src/components/stats-bar.js:85` | Move click-outside logic into `renderStatsBar` scope; use a named function with `removeEventListener` | 30 min |
| Undefined temptation sort order | `src/firebase/db-service.js:15` | Add `orderBy('createdAt', 'desc')` to `listenToTemptations` query; deploy Firestore index | 1 hr |

---

## Anti-Scope (Do Not Build in This Cycle)

Based on the product analysis, these were considered and explicitly deferred:

| Feature | Reason to defer |
|---|---|
| Push / PWA notifications | Requires Cloud Functions (backend execution); validate retention problem first |
| Category tagging | Adds friction to the logging moment; not enough data to make insights meaningful yet |
| Multiple savings goals | Different product for a different user — keep the one-jar simplicity |

---

## Feature → File Map (Quick Reference)

| Feature | New Files | Modified Files |
|---|---|---|
| Deposit Modal | — | `weekly-review.js`, `components.css` |
| Temptation Edit | — | `db-service.js`, `main.js`, `weekly-review.js` |
| Streak Tracking | `streak-calculator.js` | `main.js`, `stats-bar.js` |
| Anon Migration | — | `db-service.js`, `main.js` |
| Insights Card | — | `weekly-review.js`, `main.js` |
| Savings Goal | — | `settings-panel.js`, `savings-dashboard.js`, `main.js` |

---

## Firestore Changes Summary

| Change | Type | When |
|---|---|---|
| `orderBy('createdAt', 'desc')` on temptations query + Firestore index | Index only (no schema) | Sprint 1 |
| `savingsGoal: number` in `settings/preferences` | Additive field | Sprint 3 |

No schema migrations required. All changes are backward-compatible.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `linkWithPopup` blocked by browser pop-up blocker | Medium | Medium | Catch `auth/popup-blocked`; show a toast instructing user to allow popups; implement redirect fallback in a follow-up |
| Streak calculation edge cases (year-boundary week IDs) | Low | Medium | Unit-test `streak-calculator.js` with edge case dates (Jan 1 in week 52/01) |
| Goal milestone re-fires on page reload | Low | Low | Acceptable; document it; future fix is a Firestore `achievements` collection |
| Firestore index deployment forgotten | Medium | Low | Include index deployment in deploy checklist; tech debt item 1.2 above |

---

*All specs in `docs/features/core/`. Feature registry at `docs/FEATURES.md`. Deploy via `npm run deploy`.*

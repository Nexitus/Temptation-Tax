# Feature: Weekly Insights Card
**Category:** Core
**Status:** 📋 Planned
**Source:** `src/components/weekly-review.js`, `src/utils/week-helpers.js`
**Last Updated:** 2026-03-18

---

## Analyst — Brief
> *Why does this exist? What problem does it solve? Who does it serve?*

- **Problem Statement:** After a week of logging temptations, users see only a monetary total at deposit time. They have no visibility into their behavioral patterns — whether they resisted more than they bought, how this week compares to last week, or what their overall discipline rate looks like. The deposit confirmation is the highest-engagement moment in the product. It currently moves money but teaches nothing.
- **User:** All users at the moment of weekly deposit confirmation.
- **Goal:** Surface a concise behavioral summary — resist rate, week-over-week comparison, items resisted vs. purchased — immediately before the user confirms their deposit, turning a transactional moment into a reflective ritual.
- **Success looks like:** A user about to deposit sees "You resisted 6 of 8 temptations this week (75%) — ↑ 12% better than last week" and feels a genuine sense of achievement before pressing Confirm.

---

## PM — Product Requirements
> *What does it do from the user's perspective?*

### User Stories
- As a user, I want to see my resist rate for the week before I confirm a deposit so that I understand my own behavior patterns.
- As a user, I want to see how this week compares to last week so that I know whether I'm improving.
- As a user making my first deposit, I want an encouraging message since there's no prior week to compare against.

### Acceptance Criteria
- [ ] The Insights Card renders above the "Total to Deposit" row in the Weekly Review, immediately before the Confirm button
- [ ] Card displays: "You resisted N of M temptations (X%)" where N = resisted count, M = total count
- [ ] Card displays: "+ $X.xx saved | − $X.xx given in" (tax amounts from resisted vs. purchased items)
- [ ] If there is a previous deposit with item data: card shows week-over-week resist rate delta (e.g., "↑ 12% vs last week" in green, or "↓ 8% vs last week" in muted red)
- [ ] If this is the user's first deposit (no prior deposits): card shows "Your first deposit — the habit starts now." instead of delta
- [ ] If all items are resisted (100% resist rate): card shows a special message — "Perfect week. 100% resisted."
- [ ] Card only renders when there are items to confirm (hidden if `itemsToConfirm.length === 0`)
- [ ] No new Firestore reads are required — all computation uses existing `weekTemptations` and `state.deposits`

### Out of Scope
- Category breakdown (requires category tagging feature)
- Monthly or all-time resist rate trends
- Insights on past weeks (history view) — only current week at deposit time

---

## Architect — Technical Design
> *How is it built? What decisions were made and why?*

- **Pattern:** Pure function `computeWeeklyInsights(weekItems, allDeposits)` defined in `weekly-review.js` (or extracted to `src/utils/insights.js` if reused later). Called inline during the render of `renderWeeklyReview` when building the HTML string. Output is a data object; rendering is done via template literals in the existing `innerHTML` pattern.
- **Key Dependencies:** None beyond existing data already passed into `renderWeeklyReview` (`temptations`, and the deposits passed through `main.js`). Deposits must be passed through from `state.deposits` as an additional argument to `renderWeeklyReview`.
- **Computation:**
  ```js
  function computeWeeklyInsights(weekItems, allDeposits) {
    const total = weekItems.length;
    const resisted = weekItems.filter(t => !t.purchased);
    const purchased = weekItems.filter(t => t.purchased);
    const resistRate = total > 0 ? (resisted.length / total) * 100 : 0;
    const resistedAmount = resisted.reduce((s, t) => s + (t.taxAmount || 0), 0);
    const purchasedAmount = purchased.reduce((s, t) => s + (t.taxAmount || 0), 0);

    // Previous week: find the most recent deposit (last by confirmedAt), read its items[]
    const sortedDeposits = [...allDeposits].sort((a, b) =>
      new Date(b.confirmedAt) - new Date(a.confirmedAt)
    );
    const prevDeposit = sortedDeposits[0]; // most recent confirmed deposit
    let prevResistRate = null;
    if (prevDeposit?.items?.length) {
      const prevResisted = prevDeposit.items.filter(i => !i.purchased).length;
      prevResistRate = (prevResisted / prevDeposit.items.length) * 100;
    }

    return { total, resistedCount: resisted.length, purchasedCount: purchased.length,
             resistRate, resistedAmount, purchasedAmount, prevResistRate };
  }
  ```
- **Design Decisions:**
  - "Previous week" is defined as the most recent confirmed deposit's items (not strictly the prior calendar week), because users may skip weeks. Using the most recent deposit gives a meaningful comparison regardless of gap.
  - The delta is shown as percentage points (not a ratio), e.g., "75% this week vs 63% last week → ↑ 12%"
  - The card is rendered inline in the existing `innerHTML` string — no separate component file needed at this scale

---

## Developer — Implementation Notes
> *How was it actually implemented? What should a dev know?*

- **Entry Point:** `src/components/weekly-review.js`
- **Signature change:** `renderWeeklyReview` needs access to `allDeposits`. Update the call in `main.js:113` to pass `state.deposits` as a new argument, and update the function signature accordingly.
- **Template insertion:** Add the insights card HTML block between the carryover section and the "Total to Deposit" footer row. Only render if `itemsToConfirm.length > 0`.
  ```html
  <div class="insights-card glass-card" style="margin-bottom: 1rem; padding: 1rem 1.25rem;">
    <p style="margin:0; font-weight:600;">This Week</p>
    <p class="muted">You resisted ${resistedCount} of ${total} temptations (${resistRate.toFixed(0)}%)</p>
    <p class="muted tabular-nums">+ ${formatCurrency(resistedAmount)} saved &nbsp;|&nbsp; − ${formatCurrency(purchasedAmount)} given in</p>
    ${deltaHtml}
  </div>
  ```
  Where `deltaHtml` is computed from `prevResistRate`:
  - `null` → `<p class="muted">Your first deposit — the habit starts now.</p>`
  - `delta > 0` → `<p style="color: var(--primary-color)">↑ ${delta.toFixed(0)}% vs last week</p>`
  - `delta < 0` → `<p style="color: var(--text-muted)">↓ ${Math.abs(delta).toFixed(0)}% vs last week</p>`
  - `delta === 0` → `<p class="muted">Same resist rate as last week</p>`
- **CSS:** The `insights-card` uses `glass-card` base. Add a subtle left accent border via `border-left: 3px solid var(--primary-color)` to visually distinguish it from the main card.
- **Edge Cases:**
  - `weekItems` is empty (all items are carryover): `total = 0` → `resistRate = 0`. The card should still render if there are carryover items — `itemsToConfirm` includes them.
  - Deposit has `items: []` or `items` is undefined (old deposits pre-feature): treat `prevResistRate` as `null` → show first-deposit message.
- **Known Limitations:**
  - The "previous week" comparison uses the most recent deposit's items, not the strict prior calendar week. If a user confirms two deposits in one week (e.g., a partial confirm), the most recent deposit's items will be compared. This is an edge case with acceptable UX behavior.

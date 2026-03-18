# Feature: Savings Goal & Milestone Targets
**Category:** Core
**Status:** 📋 Planned
**Source:** `src/components/savings-dashboard.js`, `src/components/settings-panel.js`, `src/firebase/db-service.js`
**Last Updated:** 2026-03-18

---

## Analyst — Brief
> *Why does this exist? What problem does it solve? Who does it serve?*

- **Problem Statement:** The dashboard projects impressive future values (e.g., "in 10 years you'll have $12,400") but there is no personal destination attached to these numbers. Without a goal, compound growth projections are interesting math but not motivating milestones. Users have no answer to "why am I doing this?" beyond a vague sense of financial discipline.
- **User:** Authenticated users who have at least one deposit and want a tangible savings target to work toward.
- **Goal:** Allow users to set a personal savings goal (e.g., "Save $5,000 for a MacBook") and show progress toward it — a percentage, a goal line on the chart, and milestone celebrations along the way.
- **Success looks like:** A user sets a $5,000 goal, sees "62% to goal" on their dashboard, sees a dashed goal line on the chart, and gets a confetti burst when their balance crosses $5,000.

---

## PM — Product Requirements
> *What does it do from the user's perspective?*

### User Stories
- As a user, I want to set a savings goal so that I have a concrete target to work toward.
- As a user, I want to see my progress toward my goal on the dashboard so that discipline feels purposeful.
- As a user, I want a celebration when I hit my goal so that reaching it feels significant.

### Acceptance Criteria
- [ ] Settings panel shows a "Savings Goal" numeric input field (currency-formatted) below the interest rate field
- [ ] Saving a goal amount writes `savingsGoal: number` to `users/{uid}/settings/preferences` via `updateUserSettings`
- [ ] Setting the goal to 0 or clearing the field removes goal UI from the dashboard (goal is effectively unset; stored as `null` or `0`)
- [ ] When a goal is set, the dashboard shows a "Progress to Goal" row: `$X,XXX / $X,XXX (XX%)`
- [ ] When a goal is set, a horizontal dashed goal line is drawn on the Chart.js savings chart at the goal amount, labeled "GOAL"
- [ ] Goal line is hidden when `currentBalance >= savingsGoal` (goal already reached)
- [ ] Milestone toasts fire when `currentBalance` crosses 25%, 50%, 75% of `savingsGoal`
- [ ] A confetti burst + success toast fires when `currentBalance` first crosses 100% of `savingsGoal`
- [ ] Milestone events fire only once per threshold — tracked in `state` to prevent re-firing on every snapshot update
- [ ] If no goal is set (`savingsGoal` is null/0/undefined), none of the above UI renders — the dashboard looks identical to today

### Out of Scope
- Multiple savings goals or named goal buckets
- Goal deadlines or time-based progress tracking
- Goal sharing or social features
- Editing goal label/description (amount only in this spec)

---

## Architect — Technical Design
> *How is it built? What decisions were made and why?*

- **Pattern:** Settings field → Firestore `settings/preferences` → `listenToSettings` snapshot → `state.settings.savingsGoal` → dashboard + chart render.
- **Key Dependencies:** `updateUserSettings` in `db-service.js` (no changes needed — `setDoc` with `merge: true` already handles new fields). Chart.js custom plugin pattern (same approach as `todayAnnotationPlugin` in `savings-dashboard.js`).
- **Firestore Schema Change:** Add `savingsGoal: number` to `settings/preferences`. This is additive — existing users without this field will have `savingsGoal === undefined`, which the dashboard treats identically to `null` (no goal UI rendered).
- **Goal Line Chart Plugin:**
  ```js
  const goalLinePlugin = {
    id: 'goalLine',
    afterDraw(chart) {
      const goal = chart.options.plugins.goalLine?.amount;
      if (!goal || goal <= 0) return;
      const y = chart.scales.y.getPixelForValue(goal);
      if (y < chart.chartArea.top || y > chart.chartArea.bottom) return; // goal above/below chart range
      const { left, right } = chart.chartArea;
      const ctx = chart.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.strokeStyle = 'rgba(255, 220, 100, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 220, 100, 0.8)';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText(`GOAL ${formatCurrency(goal, currency)}`, left + 8, y - 6);
      ctx.restore();
    }
  };
  ```
  Registered alongside `crosshairPlugin` and `todayAnnotationPlugin` in the chart's `plugins` array. Goal amount passed via `chart.options.plugins.goalLine.amount`.
- **Milestone Tracking in `main.js`:**
  - Add `state.milestoneReached = new Set()` to initial state
  - In `updateOverallStats()`, after computing `currentBalance = totalSaved + interestGains`:
    - Check `[0.25, 0.5, 0.75, 1.0]` thresholds against `savingsGoal`
    - For each threshold: if `currentBalance >= savingsGoal * threshold` and threshold not in `state.milestoneReached`, fire toast/confetti and add to Set
- **Design Decisions:**
  - Custom chart plugin instead of `chartjs-plugin-annotation` to keep the bundle lean (consistent with the existing plugin pattern)
  - Goal line uses a warm yellow/gold color (distinct from the green primary and purple secondary) so it reads as a different layer of meaning on the chart
  - `state.milestoneReached` is in-memory only — it resets on page reload. This is acceptable: if the user refreshes, the milestone toast may re-fire, but only for the lowest unrecorded threshold. A Firestore-persisted `achievements` collection is the long-term solution (out of scope here).

---

## Developer — Implementation Notes
> *How was it actually implemented? What should a dev know?*

- **Changes in `settings-panel.js`:**
  - Add a new form row for "Savings Goal" between the interest rate and the reset button
  - Input type `number`, `min="0"`, `step="100"`, value bound to `settings.savingsGoal || ''`
  - On change, call `onUpdate({ savingsGoal: parseFloat(e.target.value) || null })` (same pattern as other settings fields)
  - Display currency symbol prefix matching the user's selected currency
- **Changes in `savings-dashboard.js`:**
  - Accept `savingsGoal` from `stats.settings.savingsGoal` (no signature change needed — it comes through `stats.settings`)
  - Add `goalLinePlugin` definition (see Architect section) above the `Chart` instantiation
  - Pass `goalLine: { amount: savingsGoal || 0 }` in `chart.options.plugins`
  - Register `goalLinePlugin` in the chart's `plugins` array alongside existing custom plugins
  - Add "Progress to Goal" HTML block in the summary stats section, conditionally rendered:
    ```js
    ${savingsGoal > 0 ? `
      <div role="status">
        <p class="stat-label">Progress to Goal</p>
        <p class="stat-value tabular-nums">${Math.min(100, ((totalSaved + interestGains) / savingsGoal * 100)).toFixed(1)}%</p>
        <p class="muted" style="font-size:0.75rem;">${formatCurrency(totalSaved + interestGains, currency)} / ${formatCurrency(savingsGoal, currency)}</p>
      </div>
    ` : ''}
    ```
- **Changes in `main.js`:**
  - Add `state.milestoneReached = new Set()` to initial state object
  - Add milestone check at the end of `updateOverallStats()` — check after `currentBalance` is computed
  - 100% milestone: call both `showToast` and the existing `confetti()` call (same parameters as deposit confetti)
- **Edge Cases:**
  - Goal is set to an amount already exceeded (user sets goal after reaching it): all milestones fire at once on the next snapshot — mitigate by pre-populating `state.milestoneReached` on first load based on current balance
  - `savingsGoal` is `NaN` (user types text in the field): guard with `parseFloat(val) || null`; treat `null` as no goal
  - Chart y-axis max is below the goal amount: Chart.js will extend the axis automatically, but the goal line label positioning should be clamped to `chart.chartArea.top` as a minimum to stay visible
- **Known Limitations:**
  - Milestone state is in-memory only — resets on page reload. The 100% milestone confetti may re-fire after a refresh. Persisting milestones to Firestore (a future `users/{uid}/achievements` collection) is the correct long-term solution.
  - The goal line is not interactive (no tooltip, no click-to-edit). Clicking the goal line has no effect.

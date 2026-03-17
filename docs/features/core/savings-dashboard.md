# Feature: Savings Dashboard
**Category:** Core
**Status:** ✅ Built
**Source:** `src/components/savings-dashboard.js`
**Last Updated:** 2026-03-17

---

## Analyst — Brief
> *Why does this exist? What problem does it solve? Who does it serve?*

- **Problem Statement:** Users who resist spending need a tangible reward. Showing a raw savings balance is underwhelming — it doesn't communicate the compounding power of their discipline or what it could become over time.
- **User:** A user who has confirmed at least one deposit and wants to see what their savings are worth now and in the future.
- **Goal:** Make the user feel wealthy. Show them the growth factor, the interest they've earned, and project what their discipline is worth in 1, 5, or 10 years.
- **Success looks like:** A user adjusts the projection slider to "5 Years" and sees their current $500 balance projected to $620 — understanding viscerally that resisting spending is compound-interest-powered investing.

---

## PM — Product Requirements
> *What does it do from the user's perspective?*

### User Stories
- As a user, I want to see my principal balance, estimated interest, and growth factor at a glance so that I understand the current value of my savings.
- As a user, I want to interact with a projection slider so that I can see what my savings could be worth over different time horizons.
- As a user, I want to see a chart of my actual deposit history so that I can visualize my savings trajectory over time.
- As a user, I want to see a projected growth line on the chart so that I can compare my current trend against future potential.
- As a user, I want to see a history of my confirmed deposits so that I have a record of my wins.

### Acceptance Criteria
- [ ] Summary section shows: Principal Balance, Estimated Interest, Growth Factor (e.g. "1.04x")
- [ ] Principal and Interest values animate from previous to new value on update
- [ ] Chart renders actual deposit history as a solid line with gradient fill
- [ ] Chart has a "TODAY" annotation line separating history from projections
- [ ] Crosshair appears on chart hover showing exact values
- [ ] Projection slider has 8 steps: Now, 1D, 1W, 3M, 6M, 1Y, 5Y, 10Y
- [ ] Active slider tick is highlighted in primary color
- [ ] Projected value display and interest label update live as slider moves
- [ ] Projected legend item appears/disappears based on whether a future timeframe is selected
- [ ] Deposit history list is sorted newest-first with date and item count per deposit

### Out of Scope
- Multiple savings goals or buckets
- Manual deposit entry (all deposits come from the Weekly Review confirmation flow)
- Exportable reports

---

## Architect — Technical Design
> *How is it built? What decisions were made and why?*

- **Pattern:** Single-responsibility render function with a module-level Chart.js instance singleton (`chartInstance`). Chart is destroyed and recreated on each render to prevent canvas context leaks.
- **Key Dependencies:** `chart.js/auto`, `animateNumber` (animate-numbers.js), `formatCurrency` (week-helpers.js)
- **Data Flow:**
  1. `renderDashboard(container, stats)` renders HTML and chart
  2. `aggregateData(deposits, annualRate)` computes per-deposit compound balance at each deposit date → builds chart labels + data arrays
  3. Chart initialized with actual data; projection dataset starts identical to actual
  4. Slider `input` event → `updateUIAndChart(false)` (no chart animation for performance during drag)
  5. Slider `change` event → `updateUIAndChart(true)` (animated update on release)
  6. Projection formula: `FV = currentBalance × (1 + r/52)^(52×t)` where `t` is years
- **Custom Chart Plugins:**
  - `crosshairPlugin` — draws a vertical dashed line at the active tooltip x position
  - `todayAnnotationPlugin` — draws a "TODAY" labeled dashed line at the boundary between historical data and projections; uses `historyCount` option to locate the correct data point
- **Design Decisions:**
  - `chartInstance.destroy()` before re-creating prevents memory leaks from multiple canvas contexts
  - Slider uses `input` (no-animate) vs `change` (animate) events for smooth drag performance
  - `aggregateData()` computes compound balance at each historical deposit date (not just raw amounts) so the chart accurately shows real growth over time
  - Interest rate is locked per deposit (`pd.interestRate || annualRate` fallback) — chart reflects the actual locked-in rate, not the current setting

---

## Developer — Implementation Notes
> *How was it actually implemented? What should a dev know?*

- **Entry Point:** `src/components/savings-dashboard.js` → `renderDashboard()`
- **Key Functions:**
  - `renderDashboard(container, stats)` — renders HTML, creates Chart instance, attaches slider listener
  - `aggregateData(deposits, annualRate)` — sorts deposits chronologically, computes compound balance at each point in time, returns `{labels, data}` for Chart.js
  - `updateUIAndChart(isFinal)` — reads slider value, computes projected future value, extends chart data with projection points, calls `chartInstance.update()`
- **Edge Cases Handled:**
  - `prevSaved` and `prevInterest` props allow `animateNumber` to transition from previous values — avoids re-animating from zero on every stats update
  - `Math.max(0, totalInterestEarned)` prevents displaying negative interest in edge cases
  - `chartInstance` module-level singleton destroyed before each re-render to prevent canvas context accumulation
  - Projection legend fades out with a 300ms timeout (not instant) to match CSS transition
- **Known Limitations:**
  - `aggregateData()` is O(n²) — for each deposit, it re-sums all previous deposits. Fine for current data volumes (< 100 deposits), but would need optimization at scale
  - Deposit history renders all items with no pagination or virtualization

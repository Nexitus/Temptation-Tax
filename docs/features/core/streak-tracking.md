# Feature: True Consecutive-Week Streak Tracking
**Category:** Core
**Status:** 📋 Planned
**Source:** `src/utils/streak-calculator.js` (new), `src/main.js`, `src/components/stats-bar.js`
**Last Updated:** 2026-03-18

---

## Analyst — Brief
> *Why does this exist? What problem does it solve? Who does it serve?*

- **Problem Statement:** The stats bar currently displays `deposits.length` as "Streak" — a raw deposit count. This is factually incorrect as a streak metric: a user who made 8 deposits scattered over 6 months sees the same value as one who maintained 8 consecutive weeks. Worse, a user who maintained a 6-week streak, skipped two weeks, and resumed cannot tell their streak broke. The habit-formation hook is entirely undermined by a misleading number.
- **User:** All users. The streak stat is always visible in the sticky header.
- **Goal:** Replace the deposit count with a genuine consecutive-ISO-week streak that reflects real habitual behavior.
- **Success looks like:** A user who has confirmed a deposit every week for the past 4 weeks sees "4-week streak 🔥". If they miss a week, they see "0-week streak" on next login. When they hit a milestone (4, 8, 12, 26, 52 weeks), a toast fires exactly once to celebrate.

---

## PM — Product Requirements
> *What does it do from the user's perspective?*

### User Stories
- As a user, I want my streak to reflect consecutive weeks of deposits so that it means something as a habit metric.
- As a user, I want to know my streak broke if I missed a week so that I understand the stakes of consistency.
- As a user, I want a celebration message when I hit a streak milestone so that long-term discipline feels rewarded.

### Acceptance Criteria
- [ ] Stats bar displays "N-week streak" (not a raw number) — e.g., "4-week streak 🔥"
- [ ] Streak is the count of consecutive ISO calendar weeks (Mon–Sun) ending with the most recent week in which the user confirmed at least one deposit
- [ ] Missing a week resets the streak to 0
- [ ] Multiple deposits in one week count as 1 week toward the streak
- [ ] A streak of 0 displays as "0-week streak" (not hidden)
- [ ] Milestone toasts fire at 4, 8, 12, 26, and 52 weeks — only on the turn the milestone is first reached
- [ ] Milestone toasts use the existing `showToast` system with `type: 'success'`
- [ ] No Firestore reads or writes are required for streak computation

### Out of Scope
- Longest-ever streak display (tracked by `calculateStreak` but not surfaced in UI in this spec)
- Push notifications for streak at-risk warnings
- Cached streak value in Firestore (optional optimization, deferred)

---

## Architect — Technical Design
> *How is it built? What decisions were made and why?*

- **Pattern:** Pure client-side computation. A new utility `src/utils/streak-calculator.js` exports `calculateStreak(deposits)` which is called inside `updateOverallStats()` in `main.js` each time the deposits snapshot updates.
- **Key Dependencies:** `getWeekIdForOffset` from `week-helpers.js` (used to determine the current week ID for streak walk-back).
- **Algorithm:**
  1. Extract `confirmedAt` from each deposit → parse to `Date` objects
  2. Convert each date to an ISO week ID using the same logic as `getWeekIdForOffset` (independent of the week-helpers import to keep the utility self-contained)
  3. Deduplicate week IDs (multiple deposits in one week = one credit)
  4. Sort descending (most recent first)
  5. Get the current week ID (`getWeekIdForOffset(0)`)
  6. If the most recent deposit week ID is neither the current week nor last week → streak is 0 (user missed at least one week)
  7. Walk backward from the most recent deposit week, incrementing streak for each consecutive week present, stopping at the first gap
  8. Return `{ currentStreak: number, longestStreak: number }`
- **Milestone tracking:** `main.js` maintains `state.lastMilestoneReached` (number, default 0). After `calculateStreak` runs, compare `currentStreak` against the milestone thresholds `[4, 8, 12, 26, 52]`. If the current streak equals a threshold AND that threshold > `state.lastMilestoneReached`, fire a toast and update `state.lastMilestoneReached`.
- **Design Decisions:**
  - Computation is entirely client-side — `confirmedAt` is already stored on every deposit document, so no schema changes are needed
  - ISO calendar week (Mon–Sun) is used to match the existing `weekId` system used throughout the app, ensuring consistent week boundaries
  - The streak does NOT require the deposit to be in the current week to be non-zero — it only requires that no week was skipped between the most recent deposit and today

---

## Developer — Implementation Notes
> *How was it actually implemented? What should a dev know?*

- **New file:** `src/utils/streak-calculator.js`
  ```js
  function dateToWeekId(date) {
    const d = new Date(date);
    const oneJan = new Date(d.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((d - oneJan) / 86400000);
    const weekNum = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
    return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
  }

  export function calculateStreak(deposits) {
    if (!deposits.length) return { currentStreak: 0, longestStreak: 0 };

    const weekIds = [...new Set(deposits.map(d => dateToWeekId(new Date(d.confirmedAt))))].sort().reverse();
    const currentWeekId = dateToWeekId(new Date());

    // Allow streak to count if user deposited this week or last week
    const mostRecent = weekIds[0];
    if (mostRecent !== currentWeekId && mostRecent !== dateToWeekId(new Date(Date.now() - 7 * 86400000))) {
      return { currentStreak: 0, longestStreak: computeLongest(weekIds) };
    }

    let streak = 0;
    let expected = mostRecent;
    for (const weekId of weekIds) {
      if (weekId === expected) {
        streak++;
        // Decrement expected by 1 week — compute previous week ID
        const [year, week] = expected.split('-W').map(Number);
        expected = week > 1
          ? `${year}-W${(week - 1).toString().padStart(2, '0')}`
          : `${year - 1}-W52`;
      } else {
        break;
      }
    }

    return { currentStreak: streak, longestStreak: computeLongest(weekIds) };
  }

  function computeLongest(sortedDescWeekIds) { /* same walk logic */ }
  ```
- **Changes in `main.js`:**
  - Import `calculateStreak` from `./utils/streak-calculator.js`
  - Add `state.lastMilestoneReached = 0` to initial state
  - In `updateOverallStats()`, replace `const totalDeposits = state.deposits.length` with `const { currentStreak } = calculateStreak(state.deposits)`
  - Pass `streak: currentStreak` to `renderStatsBar` (replacing `streak: totalDeposits`)
  - After computing `currentStreak`, check milestones and fire toasts
- **Changes in `stats-bar.js`:** Update the streak pill display from `${stats.streak}🔥` to `${stats.streak}-week streak 🔥`
- **Edge Cases:**
  - Empty deposits array → streak 0, no milestone toast
  - All deposits in the same week → streak 1
  - Deposits exist but all are older than last week → streak 0 (correctly reset)
- **Known Limitations:**
  - Week ID derivation is duplicated from `week-helpers.js` to keep `streak-calculator.js` dependency-free and independently testable. A future refactor could extract a shared `dateToWeekId` helper.
  - The "last week tolerance" (allowing last week's deposit to keep streak alive) means a user who deposits at 11:59pm Sunday and checks at 12:01am Monday will still show their streak. This is the intended behavior.

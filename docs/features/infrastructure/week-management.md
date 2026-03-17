# Feature: Week Management
**Category:** Infrastructure
**Status:** ✅ Built
**Source:** `src/utils/week-helpers.js`
**Last Updated:** 2026-03-17

---

## Analyst — Brief
> *Why does this exist? What problem does it solve? Who does it serve?*

- **Problem Statement:** Temptation Tax is built around a weekly savings cycle — users log all week and settle every week. Without a reliable system for bucketing data by week, filtering by current/past weeks, and navigating history, the entire Weekly Review feature breaks down.
- **User:** Internal — used by the Weekly Review component, the data layer (`db-service.js`), and any code that needs to work with week-scoped data.
- **Goal:** Provide a consistent, offset-based week system that any module can use without duplicating date math.
- **Success looks like:** A temptation logged on any day of the week gets the same `weekId` as all other temptations from that week — and that ID never collides with another week.

---

## PM — Product Requirements
> *What does it do from the user's perspective?*

### User Stories
- As the app, I need to assign each temptation a stable week ID at logging time so that it can be filtered and grouped correctly.
- As the app, I need to calculate the current week ID so that I know which week a new temptation belongs to.
- As the Weekly Review, I need to get the week ID for any offset (current, last week, two weeks ago) so that navigation works correctly.
- As the Weekly Review, I need to display a human-readable date range for any week so that users know which dates they're reviewing.
- As the Weekly Review, I need a human-readable label for each week offset so that navigation is clear ("This Week", "Last Week", "2 Weeks Ago").

### Acceptance Criteria
- [ ] `getCurrentWeekId()` returns the ISO week ID for the current week (e.g. `"2026-W11"`)
- [ ] `getWeekIdForOffset(0)` equals `getCurrentWeekId()`
- [ ] `getWeekIdForOffset(-1)` returns last week's ID; `getWeekIdForOffset(-2)` two weeks ago
- [ ] Week IDs are zero-padded (e.g. `"2026-W01"` not `"2026-W1"`)
- [ ] `getWeekRangeDisplayForOffset(0)` returns a Monday–Sunday range in the user's locale
- [ ] `getWeekLabel(0)` returns `"This Week"`, `getWeekLabel(-1)` returns `"Last Week"`, `getWeekLabel(-n)` returns `"n Weeks Ago"`
- [ ] `formatCurrency(amount, currency)` formats using `Intl.NumberFormat` with correct symbol and separators

### Out of Scope
- Time zone awareness (all calculations use local device time)
- Custom week start day (Monday is hardcoded)
- ISO 8601 strict compliance verification

---

## Architect — Technical Design
> *How is it built? What decisions were made and why?*

- **Pattern:** Module of pure utility functions. All functions accept offset parameters; the current-week variants are thin wrappers calling the offset variants with `0`.
- **Key Dependencies:** Native `Date` API, `Intl.NumberFormat`
- **Week ID Algorithm:**
  1. Compute target date by adjusting `new Date()` by `offset * 7` days
  2. Find Jan 1 of the target year
  3. Compute number of days from Jan 1 to target date
  4. `weekNumber = Math.ceil((dayOfWeek + 1 + numberOfDays) / 7)`
  5. Return `"YYYY-WWW"` with zero-padded week number
- **Week Range Algorithm:**
  1. Find the Monday of the target week: `date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)`
  2. Sunday = Monday + 6 days
  3. Format both with `{ month: 'short', day: 'numeric' }` via `toLocaleDateString`
- **Design Decisions:**
  - ISO-style week IDs (YYYY-Www) chosen because they sort lexicographically — string comparison `<` and `>` correctly determines past vs. future weeks without date parsing
  - `formatCurrency` placed in this module (rather than a dedicated formatting util) for convenience since all components that use date functions also need currency formatting

---

## Developer — Implementation Notes
> *How was it actually implemented? What should a dev know?*

- **Entry Point:** `src/utils/week-helpers.js`
- **Key Functions:**
  - `getCurrentWeekId()` → `getWeekIdForOffset(0)` — thin wrapper
  - `getWeekIdForOffset(offset)` — core week ID calculation
  - `getWeekRangeDisplayForOffset(offset)` — Monday–Sunday range string
  - `getWeekLabel(offset)` — human-readable label
  - `formatCurrency(amount, currency)` — Intl-based currency formatter
- **Edge Cases Handled:**
  - Week numbers zero-padded via `.padStart(2, '0')` — ensures `"W01"` not `"W1"` for correct string sorting
  - Monday calculation handles Sunday (0) as a special case: `day === 0 ? -6 : 1` — Sunday is treated as the last day of the previous week, not the first day of the next
- **Known Limitations:**
  - Week calculation is a local approximation of ISO 8601 week numbering — may have edge-case discrepancies for weeks spanning year boundaries (e.g. Dec 31 in week 1 of the next year)
  - No time zone handling — a user crossing midnight in a different time zone may assign a temptation to the wrong week
  - `getWeekRangeDisplayForOffset` mutates the `now` Date object internally (via `setDate`) — safe for current usage but should not be used in a context where the original date object needs to remain unchanged

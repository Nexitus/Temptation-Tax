# Feature: Stats Bar
**Category:** Core
**Status:** ✅ Built
**Source:** `src/components/stats-bar.js`
**Last Updated:** 2026-03-17

---

## Analyst — Brief
> *Why does this exist? What problem does it solve? Who does it serve?*

- **Problem Statement:** Users need a persistent anchor point — a place where their progress is always visible regardless of where they are in the app. A sticky header that shows their total saved and deposit streak provides constant positive reinforcement.
- **User:** Any authenticated user actively using the app. Anonymous users see the same header but with a prominent upgrade CTA.
- **Goal:** Reinforce savings behavior with always-visible progress stats, and provide a single surface for auth actions (login upgrade, sign out, settings).
- **Success looks like:** Every time a user opens the app or confirms a deposit, they see their total saved number tick up — making each win immediately visible.

---

## PM — Product Requirements
> *What does it do from the user's perspective?*

### User Stories
- As a user, I want to always see my total amount saved at the top of the app so that my progress is a constant motivator.
- As a user, I want to see my deposit streak so that I'm motivated to keep making weekly deposits.
- As an authenticated user, I want to access settings and sign out from a user pill dropdown so that account management is always accessible.
- As an anonymous user, I want to see a clear prompt to upgrade my account so that I understand my data is at risk.

### Acceptance Criteria
- [ ] Stats bar is always visible at the top of the app (sticky header)
- [ ] "Saved" pill displays total savings balance, formatted in user's selected currency
- [ ] "Streak" pill displays total confirmed deposit count with a 🔥 emoji
- [ ] Total saved value animates from previous value to new value when it changes
- [ ] Authenticated users see an avatar pill with their photo (or fallback icon) and display name
- [ ] Clicking the avatar pill toggles a dropdown with settings and sign-out options
- [ ] Dropdown closes when clicking anywhere outside it
- [ ] Anonymous/logged-out users see a "Login for Sync" warning button instead of the avatar pill
- [ ] Clicking the logo scrolls to the top of the page

### Out of Scope
- Notification badges
- Mobile-specific bottom navigation bar
- Multiple stats pills (current design shows Saved + Streak only)

---

## Architect — Technical Design
> *How is it built? What decisions were made and why?*

- **Pattern:** Stateless render function. Re-renders on every stats change (total saved, deposits count, auth state). `animateNumber` is called externally from `main.js` after render, targeting the pill element by DOM query.
- **Key Dependencies:** `formatCurrency` (week-helpers.js)
- **Data Flow:**
  1. `renderStatsBar(container, stats, onSignIn, onSignOut)` renders the full header HTML
  2. `main.js` `updateOverallStats()` calls `renderStatsBar`, then queries `.stats-pill:first-child span:last-child` to animate the saved number
  3. Dropdown toggle: click on `user-pill` toggles `settings-dropdown` display + `aria-expanded`
  4. Global `document` click listener on the module handles outside-click dismissal
- **Design Decisions:**
  - Settings panel (`renderSettings()`) is mounted inside the dropdown (`dropdown-settings-mount` div) rather than as a separate page section — keeps settings close to auth actions and reduces scrolling
  - `aria-expanded` updated on toggle for screen reader compliance
  - Global click listener registered at module load time (not inside render) to avoid duplicate listeners on re-renders

---

## Developer — Implementation Notes
> *How was it actually implemented? What should a dev know?*

- **Entry Point:** `src/components/stats-bar.js` → `renderStatsBar()`
- **Key Functions:**
  - `renderStatsBar(container, stats, onSignIn, onSignOut)` — renders header HTML conditionally based on `stats.user?.isAnonymous`
- **Edge Cases Handled:**
  - `stats.user?.photoURL` optional chain — falls back to a `👤` emoji icon if no photo URL exists
  - `stats.user?.displayName || 'User'` fallback for missing display name
  - `animateNumber` is called from `main.js` with a selector query after `renderStatsBar` completes — the stats bar component itself does not import `animateNumber` to keep it simple
  - Module-level `document.addEventListener('click', ...)` for dropdown dismissal runs once at module load, not on each render — prevents accumulating duplicate listeners
- **Known Limitations:**
  - Total saved animation target is selected via `.stats-pill:first-child span:last-child` — a brittle CSS selector that breaks if pill order or HTML structure changes
  - Streak is currently the total deposit count, not a true consecutive-week streak (would require more complex date logic)

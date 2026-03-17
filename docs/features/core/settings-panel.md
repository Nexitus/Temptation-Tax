# Feature: Settings Panel
**Category:** Core
**Status:** ✅ Built
**Source:** `src/components/settings-panel.js`
**Last Updated:** 2026-03-17

---

## Analyst — Brief
> *Why does this exist? What problem does it solve? Who does it serve?*

- **Problem Statement:** A 10% resist tax may feel meaningless to a high earner and overwhelming to a student. Users in Canada, the UK, or Australia need their own currency. A one-size-fits-all configuration undermines the personal accountability that makes this app work.
- **User:** An authenticated user who wants to calibrate the app to their financial situation and personal goals.
- **Goal:** Give users control over the three numbers that drive the entire app — resist tax rate, purchase tax rate, and HISA interest rate — plus currency selection.
- **Success looks like:** A user in Canada sets their currency to CAD, adjusts their resist tax to 15% to make it feel "real", and enters their actual HISA rate of 4.5% — and the entire dashboard recalculates immediately.

---

## PM — Product Requirements
> *What does it do from the user's perspective?*

### User Stories
- As an authenticated user, I want to set my resist tax rate so that the savings tax feels proportional to my temptation behavior.
- As an authenticated user, I want to set a higher purchase tax rate so that giving in costs more than resisting.
- As an authenticated user, I want to enter my actual HISA interest rate so that projections reflect reality.
- As an authenticated user, I want to select my currency so that all values display in my local currency.
- As an authenticated user, I want to reset all my data so that I can start fresh without uninstalling the app.

### Acceptance Criteria
- [ ] Settings panel is only visible to authenticated (non-anonymous) users
- [ ] Resist Tax Rate field accepts integers 1–100; displays as percentage
- [ ] Purchase Tax Rate field accepts integers 1–100; displays as percentage
- [ ] HISA Interest Rate field accepts decimals 0–20; displays as percentage
- [ ] Currency dropdown supports: USD, CAD, EUR, GBP, AUD
- [ ] All settings changes auto-save to Firestore on field `change` event (no save button needed)
- [ ] Settings changes propagate to the entire app immediately via the Firestore real-time listener
- [ ] "Reset All Data" button requires a confirmation dialog before proceeding
- [ ] Reset clears temptations and deposits but preserves settings (tax rates, currency, interest rate)

### Out of Scope
- Per-category tax rates
- Custom currency input (only predefined list)
- Settings backup/export
- Multiple savings profiles

---

## Architect — Technical Design
> *How is it built? What decisions were made and why?*

- **Pattern:** Form with `change` event listeners → immediate Firestore write via `updateUserSettings` (merge). No local state; Firestore `onSnapshot` in `main.js` propagates the update back through the app reactively.
- **Key Dependencies:** `updateUserSettings`, `resetData` (db-service.js)
- **Data Flow:**
  1. `renderSettings(container, settings, onChange, onReset)` renders the form pre-populated with current settings
  2. Any field `change` → `handleUpdate()` reads all four values → calls `onChange(newSettings)` → `updateUserSettings()` in Firestore
  3. Firestore `onSnapshot` in `main.js` fires → `state.settings` updated → `updateOverallStats()` + `mountInputComponents()` re-render all components
  4. Reset → `onReset()` → `resetData()` deletes temptations and deposits collections
- **Design Decisions:**
  - Auto-save on `change` (not `input`) prevents excessive Firestore writes while a user is typing a number
  - Settings are stored as decimals in Firestore (`taxRate: 0.10`) but displayed as integers in the UI (`10`) — consistent with how financial rates are communicated
  - Mounted inside the stats bar dropdown (`dropdown-settings-mount`) for authenticated users, keeping the main content area uncluttered
  - `resetData()` preserves the `settings/preferences` document — users shouldn't lose their configuration when clearing data

---

## Developer — Implementation Notes
> *How was it actually implemented? What should a dev know?*

- **Entry Point:** `src/components/settings-panel.js` → `renderSettings()`
- **Key Functions:**
  - `renderSettings(container, settings, onChange, onReset)` — renders form, attaches `change` listeners on all inputs
  - `handleUpdate()` — reads all form values, validates (no NaN check needed since inputs have `type="number"`), calls `onChange`
- **Edge Cases Handled:**
  - `!isNaN(taxRate) && !isNaN(purchaseTaxRate) && !isNaN(interestRate)` guard prevents writing invalid data to Firestore if a user clears a field entirely
  - Reset `confirm()` dialog text explicitly states what is and isn't deleted: "savings history and temptation lists...settings will be preserved"
  - `renderSettings()` called inside `renderSettingsPanel()` in `main.js` which checks `state.user && !state.user.isAnonymous` — anonymous users never see settings
- **Known Limitations:**
  - No debouncing on `change` events — each field change triggers one Firestore write (acceptable, but could be batched)
  - `resetData()` does not reset `state` in memory — the Firestore listeners update state reactively, but there's a brief moment where stale data may render
  - Currency list is hardcoded in the component; adding a new currency requires a code change

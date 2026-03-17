# Feature: Temptation Form
**Category:** Core
**Status:** ✅ Built
**Source:** `src/components/temptation-form.js`
**Last Updated:** 2026-03-17

---

## Analyst — Brief
> *Why does this exist? What problem does it solve? Who does it serve?*

- **Problem Statement:** Impulse spending happens in the moment. If logging a temptation takes more than 10 seconds, users won't do it. The app needs a fast, focused input surface that also provides instant psychological feedback — the tax amount.
- **User:** A heavy impulse buyer who just encountered something they want to buy. They need to log it quickly, see what it would cost them in taxes, and feel the friction of the decision.
- **Goal:** Make logging a temptation the path of least resistance — faster than opening a shopping app, more satisfying than doing nothing.
- **Success looks like:** A user can enter an item name and price, see their tax calculated in real-time, toggle whether they resisted or bought it, and submit in under 15 seconds.

---

## PM — Product Requirements
> *What does it do from the user's perspective?*

### User Stories
- As a user, I want to enter the name and price of an item I'm tempted to buy so that I can log it and trigger a savings tax.
- As a user, I want to see my calculated tax amount update in real-time as I type the price so that I understand the financial impact before committing.
- As a user, I want to toggle whether I resisted or purchased the item so that the correct tax rate is applied.
- As a user, I want the form to reset after submission so that I can log another item immediately.

### Acceptance Criteria
- [ ] Item name field accepts text up to 100 characters; required
- [ ] Price field accepts decimal numbers; required
- [ ] Tax preview updates live on every price keystroke and toggle change
- [ ] Tax label switches between "Resist Tax (X%)" and "Purchase Tax (X%)" based on toggle state
- [ ] Tax amount animates smoothly when it changes (no abrupt number jumps)
- [ ] Submit button is disabled and shows "Saving..." during submission to prevent double-submit
- [ ] Form resets to empty state after successful save
- [ ] Saved item appears in the weekly list immediately (optimistic UI) before Firestore confirms

### Out of Scope
- Image/photo attachment for items
- Category tagging at logging time
- Editing a logged temptation (delete + re-add is the current flow)

---

## Architect — Technical Design
> *How is it built? What decisions were made and why?*

- **Pattern:** Imperative DOM rendering via `innerHTML` injection. Event listeners attached after render. No framework.
- **Key Dependencies:** `animateNumber` (animate-numbers.js), `formatCurrency` (week-helpers.js)
- **Data Flow:**
  1. `renderTemptationForm(container, settings, onSave)` renders the form HTML
  2. `updatePreview()` reads price + toggle, calculates `price × rate`, animates the preview display
  3. On submit → calls `onSave(item)` callback passed from `main.js`
  4. `main.js` `handleSaveTemptation` does optimistic UI update, then calls `addTemptation()` in Firestore
- **Design Decisions:**
  - Tax rates passed in via `settings` prop — form is stateless regarding rates, making it easy to re-render when settings change
  - Optimistic UI in `handleSaveTemptation` (not in the component) keeps the component pure
  - `lastTax` variable prevents redundant animation calls when the value hasn't changed

---

## Developer — Implementation Notes
> *How was it actually implemented? What should a dev know?*

- **Entry Point:** `src/components/temptation-form.js` → `renderTemptationForm()`
- **Key Functions:**
  - `renderTemptationForm(container, settings, onSave)` — renders HTML, attaches all listeners
  - `updatePreview()` — recalculates tax, calls `animateNumber` if value changed, updates label text
- **Edge Cases Handled:**
  - `submitBtn.disabled = true` + text change prevents double-submission on slow networks
  - `parseFloat(priceInput.value) || 0` prevents NaN in tax preview when price is empty
  - `lastTax` guard prevents animation from firing repeatedly when user types but tax doesn't change (e.g. no price entered)
  - `form.reset()` + `updatePreview()` called in `finally` block — resets even if save fails
- **Known Limitations:**
  - The decorative currency icon inside the price input field is hardcoded as `$` (line 31) — even when the user's currency is EUR, the label correctly shows `€` but the input prefix icon still shows `$`
  - Form re-renders completely when settings change (via `mountInputComponents()`), which resets any in-progress input

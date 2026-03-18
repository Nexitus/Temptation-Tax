# Feature: Temptation Editing
**Category:** Core
**Status:** 📋 Planned
**Source:** `src/components/weekly-review.js`, `src/firebase/db-service.js`
**Last Updated:** 2026-03-18

---

## Analyst — Brief
> *Why does this exist? What problem does it solve? Who does it serve?*

- **Problem Statement:** Users who mis-type a price, item name, or accidentally mark the wrong status (purchased vs. resisted) must delete the item and re-add it from scratch. For an app that depends on fast, frictionless logging, forcing a delete-and-reenter loop for a simple correction is a meaningful quality-of-life gap.
- **User:** Any user who has logged a temptation and needs to correct it before deposit confirmation.
- **Goal:** Allow inline editing of pending (unconfirmed) temptation items directly from the Weekly Review list.
- **Success looks like:** A user who logged "$49.99 Nike shoes" but meant "$149.99" can tap a pencil icon, correct the price in-place, and see the tax amount update immediately — in under 10 seconds.

---

## PM — Product Requirements
> *What does it do from the user's perspective?*

### User Stories
- As a user, I want to correct the name or price of a logged temptation so that my deposit amount is accurate.
- As a user, I want to change a temptation's status from "purchased" to "resisted" (or vice versa) so that my tax rate applies correctly.
- As a user, I want the tax amount to update immediately when I change the price or status so that I can see the corrected value before saving.

### Acceptance Criteria
- [ ] Each pending temptation item row in the Weekly Review shows a pencil (edit) icon, visible on hover (desktop) or always visible (mobile)
- [ ] Clicking the pencil icon transforms the item row into an inline edit form with: text input for name, number input for price, toggle for purchased/resisted status
- [ ] While in edit mode, the tax amount preview updates in real-time as the user changes price or status
- [ ] Clicking "Save" writes the updated fields to Firestore and returns the row to display mode
- [ ] Clicking "Cancel" discards changes and returns the row to display mode without a Firestore write
- [ ] Only items in the current unconfirmed list (pending temptations) can be edited — items inside confirmed deposits are not editable
- [ ] Items with a `temp-` ID (optimistic UI, not yet written to Firestore) show the edit icon as disabled until the Firestore write completes
- [ ] Saving an edit shows a success toast: "Temptation updated"
- [ ] A failed save shows an error toast and leaves the row in edit mode

### Out of Scope
- Editing items inside confirmed deposit history (those are immutable by design — the deposit is the locked record)
- Bulk editing
- Undo/redo

---

## Architect — Technical Design
> *How is it built? What decisions were made and why?*

- **Pattern:** Stateful row toggle inside `weekly-review.js`. A local `Set` of item IDs in edit mode (`editingIds`) drives whether a given row renders in display or edit mode. The `renderWeeklyReview` function is re-called (causing a full re-render) after a successful save, which collapses the edit state naturally via the Firestore `onSnapshot` callback chain.
- **Key Dependencies:** New `updateTemptation(uid, itemId, updates)` function in `db-service.js` using Firestore `updateDoc`.
- **Data Flow:**
  1. User clicks edit icon → `editingIds.add(itemId)` → row re-renders as inline form (local state change, no Firestore call)
  2. User edits fields → client-side tax recalculation using `price * (purchased ? purchaseTaxRate : taxRate)`
  3. User clicks Save → `updateTemptation(uid, itemId, { name, price, purchased, taxAmount })` called
  4. Firestore `onSnapshot` fires with updated doc → `state.temptations` updates → `updateWeeklyList()` re-renders → edit mode naturally cleared
  5. User clicks Cancel → `editingIds.delete(itemId)` → row returns to display mode
- **Design Decisions:**
  - `editingIds` is a module-level `Set` (not inside the render function) so it survives re-renders triggered by other state changes (e.g., a new item being added while an item is being edited)
  - Tax recalculation is client-side only during editing — the authoritative value is written to Firestore on Save, and the Firestore listener confirms the update
  - `updateDoc` is used (not `setDoc`) so only the changed fields are written — `weekId` and `createdAt` are preserved

---

## Developer — Implementation Notes
> *How was it actually implemented? What should a dev know?*

- **Entry Point:** `src/firebase/db-service.js` (new function), `src/components/weekly-review.js` (UI changes)
- **New function in `db-service.js`:**
  ```js
  import { updateDoc } from 'firebase/firestore';

  export async function updateTemptation(uid, itemId, updates) {
      return updateDoc(doc(db, `users/${uid}/temptations`, itemId), updates);
  }
  ```
- **Changes in `weekly-review.js`:**
  - Add `import { updateTemptation } from '../firebase/db-service.js'` (or pass `onUpdate` handler from `main.js` like `onDelete`)
  - Declare `const editingIds = new Set()` at module scope (outside `renderWeeklyReview`)
  - In the item template: add edit icon button; conditionally render inline form vs. display row based on `editingIds.has(t.id)`
  - In the event listener attachment section: wire up edit icon → `editingIds.add(id)` + re-render; save button → call `updateTemptation` + `editingIds.delete(id)`; cancel button → `editingIds.delete(id)` + re-render
  - Tax preview formula: `price * (purchased ? settings.purchaseTaxRate : settings.taxRate)`
- **Import path:** `updateTemptation` should be passed in from `main.js` as a handler (consistent with `onDelete`) to keep `weekly-review.js` free of direct Firebase imports. Add `handleUpdateTemptation` to `main.js` following the same pattern as `handleDeleteTemptation`.
- **Edge Cases:**
  - Guard against editing a `temp-` ID item: check `t.id.startsWith('temp-')` and render edit icon as `disabled`
  - On Save error: leave `editingIds` populated so the row stays in edit mode; show error toast
  - Items in `actualCarriedOverTemptations` are valid targets for editing (they're still pending) — apply the same edit UI to the carryover section
- **Known Limitations:**
  - Full re-render on save means other items lose their scroll position momentarily. This is acceptable for the current innerHTML re-render architecture.
  - Editing is not available for items already inside `deposits[].items[]` — this is intentional and must be communicated to the user if they try to find a historical edit path.

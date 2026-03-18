# Feature: Custom Deposit Confirmation Modal
**Category:** Core
**Status:** 📋 Planned
**Source:** `src/components/weekly-review.js`
**Last Updated:** 2026-03-18

---

## Analyst — Brief
> *Why does this exist? What problem does it solve? Who does it serve?*

- **Problem Statement:** The deposit confirmation moment is the highest-stakes emotional beat in the product — the user is committing real discipline to a real financial action. The current implementation uses `window.confirm()` (a native OS dialog), which breaks the premium glassmorphism aesthetic with a grey system popup. It also removes any opportunity to make that moment feel weighty, reflective, or brand-aligned.
- **User:** Every authenticated user who confirms a weekly deposit.
- **Goal:** Replace the native dialog with a custom glass modal that maintains the aesthetic, conveys the financial weight of the action, and surfaces a summary of what's being cleared.
- **Success looks like:** The confirmation moment feels like a premium fintech interaction — a deliberate pause where the user sees exactly what they're depositing and why, before pressing a green CTA.

---

## PM — Product Requirements
> *What does it do from the user's perspective?*

### User Stories
- As a user, I want to see a beautiful confirmation dialog when I deposit so that the moment feels as significant as it is.
- As a user, I want to see the deposit total and a list of items being cleared before I confirm so that I know exactly what I'm committing to.
- As a user, I want to be able to cancel without consequence so that I don't feel locked in.

### Acceptance Criteria
- [ ] Clicking "Confirm Deposit to HISA" opens a custom modal overlay — no `window.confirm()` call
- [ ] Modal displays: formatted deposit total, count of items being cleared, and names of up to 5 items (truncated if more)
- [ ] Modal has two buttons: "Confirm" (green primary CTA) and "Cancel" (ghost/muted secondary)
- [ ] Pressing Enter while the modal is open triggers Confirm
- [ ] Pressing Escape while the modal is open triggers Cancel
- [ ] While the Firestore write is in progress, the Confirm button shows "Processing..." and is disabled
- [ ] On success, the modal closes automatically and confetti fires as before
- [ ] On error, the modal closes, an error toast is shown, and the confirm button is re-enabled
- [ ] Modal uses existing `glass-card` CSS patterns for visual consistency
- [ ] Modal traps focus within the overlay (ARIA `role="dialog"`, `aria-modal="true"`)

### Out of Scope
- Embedding the Weekly Insights Card inside the modal (that is a separate feature)
- Animation beyond a simple fade-in (can be added when animations pass is done)
- Mobile-specific layout changes

---

## Architect — Technical Design
> *How is it built? What decisions were made and why?*

- **Pattern:** Promise-based imperative modal rendered inline inside `weekly-review.js`. The confirm button's click handler calls `showConfirmModal(amount, items, currency)` which returns a Promise that resolves `true` (confirmed) or `false` (cancelled). This keeps the component self-contained with no new files.
- **Key Dependencies:** No new dependencies. Uses existing CSS custom properties and `glass-card` class.
- **Data Flow:**
  1. User clicks "Confirm Deposit to HISA"
  2. `showConfirmModal(totalConfirmTax, itemsToConfirm, currency)` renders a modal overlay into `document.body` and returns a Promise
  3. User clicks Confirm → Promise resolves `true` → existing `onConfirm(amount, items)` is called
  4. User clicks Cancel or presses Escape → Promise resolves `false` → button re-enables, no action
  5. On Confirm path: button enters loading state, `onConfirm` awaits, modal closes on success/error
- **Design Decisions:**
  - Modal is appended to `document.body` (not inside the weekly-review container) so it can be fullscreen without z-index conflicts with sticky headers
  - The function is defined inside `weekly-review.js` (not exported as a utility) because it is tightly coupled to the deposit confirmation UX and not reused elsewhere
  - Item list is capped at 5 displayed names with a "+ N more" overflow label to keep the modal compact
  - Focus is moved to the Cancel button on modal open (safer default — accidental Enter won't confirm)

---

## Developer — Implementation Notes
> *How was it actually implemented? What should a dev know?*

- **Entry Point:** `src/components/weekly-review.js`, inside the `'click'` listener for `#confirm-deposit-btn` (currently at line 143)
- **Key Changes:**
  - Replace `if (confirm(...))` with `const confirmed = await showConfirmModal(...)` where `showConfirmModal` is a locally-defined async function
  - `showConfirmModal(amount, items, currency)`:
    1. Creates a `<div class="modal-overlay">` appended to `document.body`
    2. Injects HTML with glass-card styles, deposit summary, item list, and two buttons
    3. Returns a Promise; event listeners on Confirm/Cancel/Escape resolve it and call `overlay.remove()`
    4. Adds `keydown` listener on `document` for Escape — removes itself on resolve
  - Loading state: on Confirm click, set confirm button `disabled = true` and `textContent = 'Processing...'`; modal stays visible until Promise returned by `onConfirm` settles
  - On success/error: call `overlay.remove()` then let the existing toast + confetti logic run normally
- **CSS needed:** `.modal-overlay` (fixed fullscreen semi-transparent backdrop), `.modal-box` (centered glass-card with max-width ~420px). Add to `components.css`.
- **Edge Cases:**
  - If `items` is empty (button should already be disabled, but as a guard): resolve `false` immediately without showing modal
  - If user navigates away mid-modal (e.g., resize event causing re-render): the overlay must be cleaned up — add `beforeunload` guard or check for overlay existence before appending
- **Known Limitations:**
  - Focus trap does not cycle through all focusable elements inside the modal (only two buttons) — sufficient for this use case but not a full WCAG 2.1 focus-trap implementation

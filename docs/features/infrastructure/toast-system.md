# Feature: Toast Notification System
**Category:** Infrastructure
**Status:** ✅ Built
**Source:** `src/utils/toast.js`
**Last Updated:** 2026-03-17

---

## Analyst — Brief
> *Why does this exist? What problem does it solve? Who does it serve?*

- **Problem Statement:** Async operations (saving a temptation, confirming a deposit, updating settings) need user feedback. Browser `alert()` is blocking and ugly. Silent failures destroy trust. A lightweight toast system gives users non-blocking, contextual feedback without interrupting their flow.
- **User:** Internal — called by `main.js` handlers after every async operation resolves or rejects.
- **Goal:** Surface success, error, warning, and info messages in a consistent, dismissible, screen-reader-accessible way.
- **Success looks like:** A user submits a temptation and sees a ✅ "Temptation logged!" toast slide in at the bottom of the screen and fade out after 3 seconds — without any interaction required.

---

## PM — Product Requirements
> *What does it do from the user's perspective?*

### User Stories
- As the app, I need to show a success message after an item is saved so that users know the action completed.
- As the app, I need to show an error message when a Firestore write fails so that users know to retry.
- As the app, I need to show a warning when data is reset so that users understand the action was irreversible.
- As a screen reader user, I need toast messages to be announced automatically so that I receive the same feedback as sighted users.

### Acceptance Criteria
- [ ] `showToast(message, type, duration)` renders a toast with the correct icon and styling for the given type
- [ ] Supported types: `success` (✅), `error` (❌), `info` (ℹ️), `warning` (⚠️)
- [ ] Toast auto-dismisses after `duration` ms (default 3000ms)
- [ ] Dismiss uses a CSS exit transition (not instant removal) for smooth UX
- [ ] Multiple toasts can stack without overwriting each other
- [ ] Toast container has `role="status"` and `aria-live="polite"` for screen reader announcements
- [ ] Container is created dynamically on first use and reused for subsequent toasts

### Out of Scope
- Manual dismiss (click to close) — toasts are auto-dismiss only
- Persistent/sticky notifications
- Action buttons inside toasts (e.g. "Undo")

---

## Architect — Technical Design
> *How is it built? What decisions were made and why?*

- **Pattern:** Singleton container pattern — one `#toast-container` div is created on first call and reused. Individual toast elements are appended, then removed after the exit transition.
- **Key Dependencies:** None (pure DOM + CSS)
- **Data Flow:**
  1. `showToast(message, type, duration)` called
  2. Checks for existing `#toast-container`; creates it if absent (with ARIA attributes)
  3. Creates a `div.toast.${type}` element with icon + message
  4. Appends to container (stacking)
  5. After `duration` ms → adds `toast-exit` class (triggers CSS fade-out)
  6. After 300ms more → removes the toast element from DOM
- **Design Decisions:**
  - Container is kept in DOM after toasts clear (not removed) — destroying and recreating an `aria-live` region can cause screen readers to miss subsequent announcements
  - Icon is `aria-hidden="true"` — decorative; the message text is the accessible content
  - `toast-exit` CSS class approach (rather than inline style removal) allows CSS transitions to handle the animation cleanly

---

## Developer — Implementation Notes
> *How was it actually implemented? What should a dev know?*

- **Entry Point:** `src/utils/toast.js` → `showToast(message, type, duration)`
- **Key Functions:**
  - `showToast(message, type = 'success', duration = 3000)` — the single exported function
- **Edge Cases Handled:**
  - Container singleton: `document.getElementById('toast-container') || document.createElement(...)` — safe to call from any module without coordination
  - `if (toast.parentNode)` check before `toast.remove()` — guards against the toast already having been removed (e.g. if `duration` is very short and the exit timeout fires first)
  - Icons object (`{ success, error, info, warning }`) with `|| ''` fallback for unknown types — fails gracefully with no icon rather than rendering `undefined`
- **Known Limitations:**
  - No maximum toast count — many rapid actions could stack many toasts simultaneously
  - CSS for `.toast`, `.toast-exit`, and type variants (`success`, `error`, `info`, `warning`) must exist in the app's stylesheet; this module does not inject styles
  - Exit animation duration (300ms) is hardcoded in JS to match CSS — they must stay in sync manually

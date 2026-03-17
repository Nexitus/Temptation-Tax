# Feature: Number Animation
**Category:** Infrastructure
**Status:** ✅ Built
**Source:** `src/utils/animate-numbers.js`
**Last Updated:** 2026-03-17

---

## Analyst — Brief
> *Why does this exist? What problem does it solve? Who does it serve?*

- **Problem Statement:** When financial numbers update — total saved, interest earned, tax preview — an abrupt jump from old value to new value feels cheap and transactional. Animating the transition makes users *feel* the momentum of their savings growing, which is core to the brand's "make discipline feel good" promise.
- **User:** Internal — used by the Stats Bar (totalSaved), the Savings Dashboard (principal + interest stats), and the Temptation Form (live tax preview).
- **Goal:** Provide a reusable, performant number animation utility with a pluggable format function so any display can animate any kind of numeric value.
- **Success looks like:** When a user confirms a deposit, the principal balance in the dashboard smoothly counts up from the old value to the new value over 1 second — not a jarring snap.

---

## PM — Product Requirements
> *What does it do from the user's perspective?*

### User Stories
- As the app, I need to animate a currency display from its previous value to its new value when savings update so that the change feels alive.
- As the app, I need to use a custom format function so that the animated value always displays correctly (e.g. as currency, not a raw float).
- As the app, I need the animation to play a shimmer visual effect on the element so that the user's eye is drawn to the change.

### Acceptance Criteria
- [ ] `animateNumber(element, start, end, duration, formatFn)` animates from `start` to `end` over `duration` ms
- [ ] Animation uses `requestAnimationFrame` for smooth 60fps performance
- [ ] Easing follows an easeOutExpo curve — fast start, gradual deceleration
- [ ] Element content is formatted via `formatFn` at every frame
- [ ] Default `formatFn` is `(v) => v.toFixed(2)`
- [ ] During animation, the element has a `number-update` CSS class (for shimmer effect)
- [ ] `number-update` class is removed when animation completes
- [ ] If `element` is null or undefined, the function exits safely without error

### Out of Scope
- Reverse animation (end < start is supported by the math but not explicitly designed for)
- Cancelling in-flight animations
- Queuing multiple animations on the same element

---

## Architect — Technical Design
> *How is it built? What decisions were made and why?*

- **Pattern:** Pure function using `requestAnimationFrame` loop. Closure over `startTime` initialized on first frame. No global state.
- **Key Dependencies:** `window.requestAnimationFrame` (native browser API)
- **Easing Formula:** `easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)`
  - At `progress = 0.1`: `~0.50` (covers half the distance in the first 10% of time)
  - At `progress = 0.5`: `~0.97` (97% of the way there at the halfway point)
  - Feels fast and satisfying — matches the premium "wealth tech" aesthetic
- **Data Flow:**
  1. `animateNumber(element, start, end, duration, formatFn)` called
  2. `element.classList.add('number-update')` triggers shimmer CSS
  3. `requestAnimationFrame(step)` starts the loop
  4. Each frame: computes `progress`, applies easing, formats and sets `element.textContent`
  5. At `progress === 1`: removes `number-update` class, loop ends

---

## Developer — Implementation Notes
> *How was it actually implemented? What should a dev know?*

- **Entry Point:** `src/utils/animate-numbers.js` → `animateNumber(element, start, end, duration, formatFn)`
- **Key Functions:**
  - `animateNumber(element, start, end, duration, formatFn)` — single exported function; inner `step()` is the rAF callback
- **Edge Cases Handled:**
  - `if (!element) return` — null guard prevents errors when called on unmounted DOM elements
  - `Math.min((timestamp - startTime) / duration, 1)` clamps progress to 1 — prevents overshoot on slow frames
  - `easeProgress = progress === 1 ? 1 : ...` — explicit check at completion ensures the final value is always exactly `end` (avoids floating point residuals)
- **Known Limitations:**
  - If a second `animateNumber` call fires on the same element before the first completes, both `rAF` loops run in parallel — the element's `textContent` will show interleaved values until the first loop completes. In practice, this is avoided by only animating on data change events, but there's no built-in cancellation mechanism
  - `number-update` CSS class must be defined in the app stylesheet; the utility does not inject it
  - No support for animating non-numeric values

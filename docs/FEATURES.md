# Temptation Tax — Feature Registry

> **Living document.** Update this table whenever a feature is added, modified, or deprecated.
> Each row links to a full BMAD spec covering: why it was built, what it does, how it's built, and implementation notes.

---

## Core Features

User-facing product features that define the experience.

| Feature | Status | Why Built | How Built | Source File(s) | Spec |
|---|---|---|---|---|---|
| Authentication | ✅ Built | Gate access to data; enable cross-device sync with zero-friction guest mode | Firebase Auth — Google OAuth popup + Anonymous sign-in; `onAuthStateChanged` drives all data listeners | `src/firebase/config.js`, `src/main.js` | [→ spec](features/core/auth.md) |
| Temptation Form | ✅ Built | Primary input surface — log impulses at the moment of desire with instant tax feedback | Vanilla JS form; dual tax rates (resist vs purchase); `animateNumber` for live preview; optimistic UI | `src/components/temptation-form.js` | [→ spec](features/core/temptation-form.md) |
| Weekly Review | ✅ Built | The settlement moment — review, carry over unconfirmed items, and commit a deposit | ISO week bucketing; week-offset navigation; carry-over logic; atomic `writeBatch` on confirm | `src/components/weekly-review.js` | [→ spec](features/core/weekly-review.md) |
| Savings Dashboard | ✅ Built | The reward screen — visualize growth and project future value to make discipline feel real | Chart.js line chart; custom crosshair + today-line plugins; projection slider (8 timeframes); compound FV formula | `src/components/savings-dashboard.js` | [→ spec](features/core/savings-dashboard.md) |
| Stats Bar | ✅ Built | Always-visible global header reinforces progress and surfaces auth actions | Sticky header; animated `totalSaved` counter; user avatar pill with settings dropdown; ARIA-compliant | `src/components/stats-bar.js` | [→ spec](features/core/stats-bar.md) |
| Settings Panel | ✅ Built | Make the app personal — users configure tax rates, interest rate, and currency | Firestore merge on change; dropdown-mounted for authenticated users; currency via `Intl.NumberFormat` | `src/components/settings-panel.js` | [→ spec](features/core/settings-panel.md) |

---

## Infrastructure

Data layer, calculation engines, and UI utility systems.

| Feature | Status | Why Built | How Built | Source File(s) | Spec |
|---|---|---|---|---|---|
| Firebase Data Layer | ✅ Built | All data must survive refresh, sync cross-device, and update in real-time | Firestore `onSnapshot` listeners per collection; `writeBatch` for atomic deposit + item clear; chunked batch delete for reset | `src/firebase/db-service.js` | [→ spec](features/infrastructure/firebase-data-layer.md) |
| Compound Interest Engine | ✅ Built | Raw principal undersells discipline — compound interest shows the TRUE value of saving | Weekly compounding `A = P(1 + r/52)^n`; interest rate locked per deposit at confirmation time | `src/utils/compound-interest.js` | [→ spec](features/infrastructure/compound-interest-engine.md) |
| Week Management | ✅ Built | Temptations must be bucketed by week for the weekly review + settlement cycle | ISO week ID generation; offset-based navigation; Monday–Sunday range display; `formatCurrency` via `Intl` | `src/utils/week-helpers.js` | [→ spec](features/infrastructure/week-management.md) |
| Toast System | ✅ Built | Non-blocking feedback for async actions without interrupting user flow | ARIA live region (`role=status`, `aria-live=polite`); dynamic DOM singleton; CSS fade + exit transition; 4 type variants | `src/utils/toast.js` | [→ spec](features/infrastructure/toast-system.md) |
| Number Animation | ✅ Built | Animating number changes makes users feel the momentum of their financial progress | `requestAnimationFrame` loop; easeOutExpo curve; pluggable `formatFn`; shimmer CSS class during transition | `src/utils/animate-numbers.js` | [→ spec](features/infrastructure/number-animation.md) |
| Confetti Celebration | ✅ Built | Confirming a deposit is a victory — confetti makes not-spending feel as good as spending | `canvas-confetti`; brand colors (`#00ff88`, `#ffffff`, `#7864ff`); fires on successful deposit confirmation | `src/main.js` (handleConfirmDeposit) | [→ spec](features/infrastructure/confetti-celebration.md) |

---

## Status Legend

| Symbol | Meaning |
|---|---|
| ✅ Built | Implemented and in production |
| 🔄 In Progress | Currently being developed |
| 📋 Planned | Approved for future development |
| ⚠️ Deprecated | Exists but marked for removal |

# Feature: Firebase Data Layer
**Category:** Infrastructure
**Status:** ✅ Built
**Source:** `src/firebase/db-service.js`, `src/firebase/config.js`
**Last Updated:** 2026-03-17

---

## Analyst — Brief
> *Why does this exist? What problem does it solve? Who does it serve?*

- **Problem Statement:** All temptation data, deposits, and settings must survive browser refreshes, sync instantly across devices, and remain consistent — especially during the critical "confirm deposit" moment where money is conceptually moved and items are deleted atomically.
- **User:** Internal — every component that reads or writes data goes through this layer.
- **Goal:** Provide a clean, centralized API for all Firestore operations, with real-time reactivity and atomic writes where consistency matters.
- **Success looks like:** A user confirms a deposit on mobile, and immediately sees the deposit appear on their desktop tab — with no duplicate items or inconsistent state.

---

## PM — Product Requirements
> *What does it do from the user's perspective?*

### User Stories
- As the app, I need to listen to a user's temptations in real-time so that the UI stays in sync with the database.
- As the app, I need to listen to deposits in real-time so that the dashboard always reflects the latest savings.
- As the app, I need to add a temptation to the database so that it persists across sessions.
- As the app, I need to confirm a deposit atomically so that items are cleared and the deposit is recorded in a single operation.
- As the app, I need to delete individual temptations so that users can correct mistakes.
- As the app, I need to reset all data in bulk so that users can start fresh without leaving orphaned documents.

### Acceptance Criteria
- [ ] `listenToTemptations` returns an unsubscribe function; updates fire on any change to the collection
- [ ] `listenToDeposits` returns an unsubscribe function; updates fire on any change to the collection
- [ ] `listenToSettings` listens to a single document; returns `null` callback if document doesn't exist
- [ ] `addTemptation` writes the item with `weekId` (current ISO week) and `createdAt` timestamp
- [ ] `processConfirmation` atomically: creates a deposit document AND deletes all confirmed temptation documents in one batch
- [ ] `deleteTemptation` removes a single document by ID
- [ ] `resetData` deletes all documents in temptations and deposits collections in chunks of ≤500 (Firestore batch limit)
- [ ] Settings are preserved during `resetData`

### Out of Scope
- Offline persistence (Firestore offline caching is not explicitly configured)
- Server-side validation or Cloud Functions
- Data migration or versioning

---

## Architect — Technical Design
> *How is it built? What decisions were made and why?*

- **Pattern:** Module of pure async functions + real-time listeners. No class or singleton — just importable functions. Each function takes `uid` as first argument to scope all operations to the authenticated user.
- **Key Dependencies:** `firebase/firestore` — `collection`, `onSnapshot`, `addDoc`, `doc`, `setDoc`, `query`, `getDocs`, `deleteDoc`, `writeBatch`
- **Firestore Schema:**
  ```
  users/{uid}/
    temptations/{auto-id}   ← {name, price, purchased, taxAmount, weekId, createdAt}
    deposits/{auto-id}      ← {amount, confirmedAt, items[], interestRate}
    settings/preferences    ← {taxRate, purchaseTaxRate, interestRate, currency}
  ```
- **Data Flow — Deposit Confirmation (critical path):**
  1. `processConfirmation(uid, amount, items, interestRate)` opens a `writeBatch`
  2. Creates new deposit document with amount, timestamp, item summaries, and locked interest rate
  3. Deletes each confirmed temptation document in the same batch
  4. `batch.commit()` — single atomic write; either all succeed or all fail
- **Design Decisions:**
  - `interestRate` is stored with each deposit at confirmation time — this "rate locking" means historical interest calculations remain accurate even if the user later changes their HISA rate
  - `resetData` uses chunked batch deletes (500 docs per batch) to respect Firestore's batch write limit
  - Settings use `setDoc(..., { merge: true })` — partial updates don't overwrite unrelated fields

---

## Developer — Implementation Notes
> *How was it actually implemented? What should a dev know?*

- **Entry Point:** `src/firebase/db-service.js`
- **Key Functions:**
  - `listenToTemptations(uid, callback)` → `onSnapshot(collection(...))` — returns unsubscribe fn
  - `listenToDeposits(uid, callback)` → same pattern
  - `listenToSettings(uid, callback)` → `onSnapshot(doc(...))` — passes `null` if doc doesn't exist
  - `addTemptation(uid, item)` → `addDoc` with `weekId: getCurrentWeekId()` injected; `id` field is destructured out of `item` before writing to Firestore to prevent fake temp IDs from being stored as document data
  - `processConfirmation(uid, amount, items, interestRate)` → `writeBatch` with deposit set + item deletes
  - `deleteTemptation(uid, itemId)` → `deleteDoc`
  - `resetData(uid)` → `getDocs` both collections, chunk into batches of 500, commit each
- **Edge Cases Handled:**
  - `items.map(i => ({ ..., taxAmount: i.taxAmount || (i.price * 0.1) }))` — backward-compatible fallback for older items without `taxAmount` when storing deposit item summaries
  - Listeners return their unsubscribe functions — `main.js` stores these in `state.unsubscribes` and calls all on auth state change to prevent memory leaks and duplicate listeners
  - `{ ...doc.data(), id: doc.id }` — `id: doc.id` is placed **after** the data spread in all listeners so the real Firestore document ID always wins, even if a stale `id` field exists in the document data
- **Known Limitations:**
  - No Firestore security rules are defined in this codebase (rules managed separately in Firebase console)
  - `resetData` deletes in series (awaits each chunk), not parallel — could be parallelized with `Promise.all` for large datasets

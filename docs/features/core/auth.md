# Feature: Authentication
**Category:** Core
**Status:** ✅ Built
**Source:** `src/firebase/config.js`, `src/main.js`
**Last Updated:** 2026-03-17

---

## Analyst — Brief
> *Why does this exist? What problem does it solve? Who does it serve?*

- **Problem Statement:** Without authentication, user data cannot persist across sessions or devices. A hard sign-in gate would create friction that kills adoption before the user sees value.
- **User:** New users who want to try the app risk-free, and returning users who need their data to follow them across devices.
- **Goal:** Enable zero-friction entry via anonymous mode while providing a clear upgrade path to persistent Google accounts.
- **Success looks like:** A user can open the app, start logging temptations immediately (anonymous), and later sign in with Google to persist all future data — without losing the session experience.

---

## PM — Product Requirements
> *What does it do from the user's perspective?*

### User Stories
- As a new user, I want to sign in with Google so that my data is saved and synced across devices.
- As a new user, I want to try the app without creating an account so that I can evaluate it risk-free.
- As an authenticated user, I want to sign out so that I can hand off my device or switch accounts.
- As an anonymous user, I want to see a clear prompt to upgrade my account so that I know my data is not yet persistent.

### Acceptance Criteria
- [ ] App shows a full-screen auth overlay when no user is detected
- [ ] "Sign in with Google" button triggers Google OAuth popup
- [ ] On successful sign-in, auth overlay dismisses and app content fades in
- [ ] Anonymous users see a "Login for Sync" warning button in the stats bar
- [ ] Authenticated users see their avatar and display name in the user pill
- [ ] Sign-out clears the session and reloads to auth overlay
- [ ] All Firestore listeners are torn down and re-established on auth state change

### Out of Scope
- Anonymous-to-Google data migration (data from anonymous sessions is not merged into the Google account)
- Email/password authentication
- Multi-account switching

---

## Architect — Technical Design
> *How is it built? What decisions were made and why?*

- **Pattern:** Firebase Auth with `onAuthStateChanged` as the single source of truth for app state. All data listeners (temptations, deposits, settings) are created inside the auth callback and torn down on sign-out.
- **Key Dependencies:** `firebase/auth` — `signInAnonymously`, `signInWithPopup`, `signOut`, `onAuthStateChanged`, `GoogleAuthProvider`
- **Data Flow:**
  1. `init()` registers `onAuthStateChanged` listener
  2. On user present → hide auth overlay, show app, set up Firestore listeners
  3. On user absent → show auth overlay, hide app, clear all listeners
- **Design Decisions:**
  - Anonymous login is not auto-triggered on load — the auth overlay serves as the entry gate, requiring an explicit user action
  - `window.location.reload()` on sign-out ensures clean state without needing to manually reset all app state
  - Google provider is configured in `config.js` (not `main.js`) to keep auth setup centralized and importable

---

## Developer — Implementation Notes
> *How was it actually implemented? What should a dev know?*

- **Entry Point:** `src/main.js` → `init()`
- **Key Functions:**
  - `init()` — registers the `onAuthStateChanged` listener; orchestrates all listener setup/teardown
  - `handleSignIn()` — calls `signInWithPopup(auth, googleProvider)`
  - `handleSignOut()` — calls `signOut(auth)` then `window.location.reload()`
  - `handleAnonymousLogin()` — calls `signInAnonymously(auth)` (currently unused in UI but preserved)
- **Edge Cases Handled:**
  - `unsubscribes` array tracks all active Firestore listeners; all are called and cleared before re-subscribing on auth change (prevents duplicate listeners)
  - Auth overlay shown only when `user` is falsy; anonymous users (`user.isAnonymous === true`) still see the app but with the sync warning
- **Known Limitations:**
  - No data migration from anonymous to Google account — the code stub exists in `handleSignIn()` but is not implemented
  - Sign-out via `window.location.reload()` is a blunt instrument; a future refactor could cleanly reset state without a full reload

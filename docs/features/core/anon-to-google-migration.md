# Feature: Anonymous-to-Google Account Migration
**Category:** Core
**Status:** 📋 Planned
**Source:** `src/main.js`, `src/firebase/db-service.js`
**Last Updated:** 2026-03-18

---

## Analyst — Brief
> *Why does this exist? What problem does it solve? Who does it serve?*

- **Problem Statement:** Anonymous users who try the app, log temptations, build up weeks of data, and then sign in with Google lose all of their data. The current `handleSignIn` calls `signInWithPopup` directly, which creates a new Google user session and leaves the anonymous Firestore path orphaned. This turns a successful conversion — a user who liked the app enough to sign in — into a trust-destroying data loss event.
- **User:** Any user who starts in anonymous mode and later signs in with Google (the primary conversion funnel).
- **Goal:** When an anonymous user signs in with Google, atomically migrate their Firestore data (temptations, deposits, settings) to the Google UID path and merge the auth identities.
- **Success looks like:** A user logs 3 weeks of temptations anonymously, clicks "Login for Sync," signs in with Google, and immediately sees all their data intact under their Google account — as if they had always been signed in.

---

## PM — Product Requirements
> *What does it do from the user's perspective?*

### User Stories
- As an anonymous user with data, I want my temptations and deposits to carry over when I sign in with Google so that my history is not lost.
- As a user, I want to see a loading indicator during migration so that I know the app is working.
- As a user, I want a confirmation message when migration is complete so that I trust my data is safe.

### Acceptance Criteria
- [ ] When `handleSignIn` is called and the current user is anonymous with at least 1 temptation or deposit, `linkWithPopup` is attempted before `signInWithPopup`
- [ ] On successful link: all temptations, deposits, and settings are copied from `users/{anonUid}/` to `users/{googleUid}/`, then deleted from the anonymous path
- [ ] A toast shows "Saving your data..." during migration and "Data saved to your Google account ✓" on success
- [ ] If `linkWithPopup` fails because the Google account already has data (existing non-anonymous user): fall back to `signInWithPopup` — migration does NOT run; a warning toast explains data was not merged
- [ ] If the Google UID already has existing deposits/temptations when migration runs (edge case): anonymous data is appended, not replaced; settings from Google account are preferred
- [ ] Migration failure (Firestore error) shows an error toast; the user remains on their Google account but their anonymous data is not deleted
- [ ] No data is deleted until the copy step is confirmed successful

### Out of Scope
- Merging two Google accounts
- Reverse migration (Google back to anonymous)
- Offline migration support
- Conflict resolution UI (automatic append is the strategy)

---

## Architect — Technical Design
> *How is it built? What decisions were made and why?*

- **Pattern:** Two-phase atomic migration — copy then delete. The copy uses `addDoc` for collection documents (new auto-generated IDs on the Google UID path) and `setDoc` with `merge: true` for settings. The delete uses chunked `writeBatch` (the same pattern as `resetData`). The delete phase only runs if all copies succeed.
- **Key Dependencies:** Firebase Auth `linkWithPopup` (already imported in `main.js` line 15). New `migrateAnonymousData(anonUid, googleUid)` function in `db-service.js`. `getDocs`, `addDoc`, `setDoc`, `deleteDoc`, `writeBatch` from Firestore.
- **Auth Flow:**
  ```
  handleSignIn() called
    └── if currentUser.isAnonymous
          └── try linkWithPopup(currentUser, googleProvider)
                ├── success: googleUid = result.user.uid
                │           anonUid = previous anon UID (captured before link)
                │           await migrateAnonymousData(anonUid, googleUid)
                │           onAuthStateChanged fires for linked account → normal app boot
                └── failure (account-exists-with-different-credential):
                      anonUid captured, then signInWithPopup(googleProvider)
                      onAuthStateChanged fires for Google account
                      show warning toast (no migration — would overwrite)
    └── else (already Google user): signInWithPopup as before
  ```
- **Migration function in `db-service.js`:**
  1. `getDocs` for `users/{anonUid}/temptations` and `users/{anonUid}/deposits`
  2. For each temptation doc: `addDoc(collection(db, 'users/{googleUid}/temptations'), doc.data())`
  3. For each deposit doc: `addDoc(collection(db, 'users/{googleUid}/deposits'), doc.data())`
  4. Get `users/{anonUid}/settings/preferences` via `getDoc`; if exists: `setDoc(googleSettingsRef, anonSettings, { merge: false })` — only write if Google UID has no settings yet
  5. Only after all copies succeed: batch-delete all anonymous docs (same chunked writeBatch pattern as `resetData`)
- **Design Decisions:**
  - The anonymous UID is captured **before** `linkWithPopup` is called because after linking, `auth.currentUser.uid` becomes the Google UID and the original anon UID is lost
  - Copy-then-delete (not move) ensures data is never in a half-migrated state — if the copy fails, the anonymous data is untouched
  - Settings preference: if the Google user has no existing settings, use anonymous user's settings. If Google user has settings, keep them (they are preferred as the "intended" configuration).

---

## Developer — Implementation Notes
> *How was it actually implemented? What should a dev know?*

- **Changes in `main.js` — `handleSignIn()`:**
  ```js
  async function handleSignIn() {
    try {
      const isAnon = state.user?.isAnonymous;
      const anonUid = state.user?.uid; // capture before any auth change

      if (isAnon) {
        try {
          await linkWithPopup(auth.currentUser, googleProvider);
          // linkWithPopup changes auth.currentUser.uid to the Google UID
          const googleUid = auth.currentUser.uid;
          showToast('Saving your data...', 'info');
          await migrateAnonymousData(anonUid, googleUid);
          showToast('Data saved to your Google account ✓', 'success');
        } catch (linkErr) {
          if (linkErr.code === 'auth/credential-already-in-use') {
            await signInWithPopup(auth, googleProvider);
            showToast('Signed in — anonymous data was not merged.', 'warning');
          } else {
            throw linkErr;
          }
        }
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (err) {
      console.error(err);
      showToast('Login failed.', 'error');
    }
  }
  ```
- **New function in `db-service.js`:**
  - Import `getDoc` in addition to existing imports
  - `migrateAnonymousData(anonUid, googleUid)`: implement copy-then-delete as described in Architect section
  - Return a Promise that rejects if any copy step fails (delete is skipped on rejection)
- **Edge Cases:**
  - Anonymous user has no data (0 temptations, 0 deposits): migration runs but is a no-op — this is fine
  - Firestore write quota exceeded during copy: migration throws, anonymous data untouched, error toast shown
  - `linkWithPopup` popup is blocked by the browser: `auth/popup-blocked` error — catch and retry with redirect-based flow (deferred to a future iteration)
- **Known Limitations:**
  - If the Google account already has existing temptations and the anonymous user also has temptations, both sets are kept (append strategy). There is no deduplication. This is the correct behavior since the user made both sets of decisions.
  - The migration does not handle subcollections beyond `temptations`, `deposits`, and `settings/preferences`. Any future subcollections must be added to `migrateAnonymousData` explicitly.

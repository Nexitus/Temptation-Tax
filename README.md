# Temptation Tax

> **Make your impulses pay you.** Every resisted desire is an investment in your future self.

Temptation Tax is a dark-themed wealth-tech web app that transforms impulse spending into long-term savings. Log what you want to buy, pay yourself a "tax" for resisting — or a higher penalty for giving in — and watch compound interest turn your discipline into real wealth.

---

## What It Does

| Action | Outcome |
|---|---|
| You resist a purchase | A configurable % of the price goes into your savings jar |
| You give in and buy it | A higher penalty % goes into your savings jar |
| End of the week | Review your temptations and confirm a deposit to your HISA |
| Over time | Compound interest grows your balance — the dashboard shows you exactly what it's worth |

---

## Features

**Core**
- Google Sign-In + anonymous guest mode
- Temptation logging form with real-time tax calculation preview
- Weekly review with carry-over of unconfirmed items
- Savings dashboard with Chart.js growth chart and interactive projection slider (Now → 10 Years)
- Persistent stats bar showing total saved, deposit streak, and auth controls
- Configurable tax rates, HISA interest rate, and currency (USD, CAD, EUR, GBP, AUD)

**Under the Hood**
- Real-time Firestore sync — changes appear instantly across devices
- Atomic deposit confirmation (Firestore `writeBatch`) — deposit recorded and items cleared together or not at all
- Per-deposit interest rate locking — historical projections stay accurate when you change your HISA rate
- ISO week bucketing for temptation grouping and weekly navigation
- easeOutExpo number animations and canvas-confetti celebration on deposit

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS, Vite |
| Auth | Firebase Authentication (Google OAuth, Anonymous) |
| Database | Cloud Firestore (real-time) |
| Charts | Chart.js |
| Animations | canvas-confetti, requestAnimationFrame |
| Hosting | Firebase Hosting |
| Fonts | Outfit, Manrope (Google Fonts) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project with Firestore and Authentication enabled

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/Nexitus/Temptation-Tax.git
   cd Temptation-Tax
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**

   Create a `.env` file in the project root with your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Run locally**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

6. **Deploy to Firebase Hosting**
   ```bash
   npm run deploy
   ```

---

## Project Structure

```
src/
  main.js                    # App init, auth state, global handlers
  firebase/
    config.js                # Firebase initialization
    db-service.js            # All Firestore operations
  components/
    temptation-form.js       # Impulse logging form
    weekly-review.js         # Weekly settlement + deposit confirmation
    savings-dashboard.js     # Chart.js dashboard + projection slider
    stats-bar.js             # Sticky header with auth and stats
    settings-panel.js        # Tax rates, currency, data reset
    footer.js
  utils/
    compound-interest.js     # Weekly compound interest calculator
    week-helpers.js          # ISO week IDs, offsets, currency formatting
    animate-numbers.js       # rAF easeOutExpo number animation
    toast.js                 # ARIA toast notification system
  styles/
    index.css
    components.css
    animations.css
```

---

## Documentation

All features are documented in the [`docs/`](docs/) directory following the **BMAD method** (Analyst → PM → Architect → Developer artifacts per feature).

- [`docs/FEATURES.md`](docs/FEATURES.md) — master feature matrix (start here)
- [`docs/features/core/`](docs/features/core/) — user-facing feature specs
- [`docs/features/infrastructure/`](docs/features/infrastructure/) — data layer and utility specs

---

## Design Philosophy

The app is built around four principles:

1. **The Friction is the Feature** — deliberate UI moments make users feel the weight of their financial choices
2. **Growth Visibility** — compound growth and future value are always front and center
3. **Glassmorphism & Depth** — dark background (`#0d0e12`), glass cards, neon glow accents
4. **Data-Driven Delight** — vibrant charts and confetti make discipline feel rewarding

---

## License

MIT

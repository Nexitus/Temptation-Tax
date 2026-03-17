# Temptation Tax - Design Context

This project transforms impulse spending into long-term savings. The design should reflect the weight of financial decisions while celebrating the growth of resisted desires.

## Feature Registry

**Always read [`docs/FEATURES.md`](docs/FEATURES.md) at the start of every session.**
It is the single source of truth for all built features — what exists, why it was built, how it works, and where to find it. Each row links to a full BMAD spec (Analyst / PM / Architect / Developer artifacts).

- Core features live in `docs/features/core/`
- Infrastructure features live in `docs/features/infrastructure/`

When adding a new feature: add a row to `docs/FEATURES.md` and create a new BMAD spec file in the appropriate folder before writing code.

## Design Context

### Users
**Heavy Impulse Buyers.**
Users who struggle with spontaneous spending and need a powerful, visual reminder to pause and reflect. The app acts as a "speed bump" for spending, turning a moment of temporary desire into a long-term investment.

### Brand Personality
**Disciplined, Premium, Growth-oriented.**
The voice is firm but rewarding. It feels like a high-end financial advisor that also operates with the efficiency of a high-performance machine.

### Aesthetic Direction
**Dark-Themed Wealth Tech (Inspired by Wealthsimple).**
- **Theme**: Permanent Dark Mode. Deep backgrounds (`#0d0e12`) with high-contrast, vibrant accents.
- **Vibe**: Sleek, modern, and serious but interactive. Uses glassmorphism and subtle gradients to create depth.
- **Anti-References**: Avoid looking like "Large Banks" (dry, corporate, blue/white/grey, cluttered with legacy UI). No "cutesy" gamification.

### Design Principles
1. **The Friction is the Feature**: Use elegant but deliberate UI moments (like modal confirmations or "Save to Jar" animations) to make the user feel the weight of their choice.
2. **Growth Visibility**: Always highlight "Compound Growth" and "Future Value" over immediate totals. Show the user what their discipline is actually worth.
3. **Glassmorphism & Depth**: Maintain the layered, premium feel with consistent use of `backdrop-filter`, subtle borders, and neon glow effects for success states.
4. **Data-Driven Delight**: Use vibrant charts (Chart.js) and micro-animations (Canvas Confetti) to reward resistance, making "not spending" feel as satisfying as "spending".

# SIRUS Timesheet System – MVP V1.0.1

Modern React + Tailwind implementation of the SIRUS Timesheet System. Includes landing page, dark/light themes, engineer + week selection, 15-minute interval tracking, CSV export, and email template generation.

## Getting started

1. Install dependencies (requires npm):
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```

## Features
- Animated splash screen with Start CTA and theme toggle (session-only).
- 2026 ISO week selector with restricted date inputs per week.
- Timesheet entries with 15-minute intervals, auto hour/total calculations, overlap validation, and cascading dropdowns.
- Weekly dashboard totals, CSV export with success modal + email actions, and reminder toast feedback.
- Reset All with confirmation and micro-animations; no persistent storage (state clears on reload or reset).

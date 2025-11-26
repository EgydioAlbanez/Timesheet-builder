# SIRUS Timesheet System – MVP V1.0

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
- Animated landing page with Start Timesheet CTA and theme toggle.
- LocalStorage persistence for theme, engineer, week, and entries with auto-save every 30s.
- 2026 ISO week selector with restricted date inputs per week.
- Timesheet entries with 15-minute intervals, auto hour/total calculations, and overlap validation.
- Cascading dropdowns for service categories/types and project scopes.
- Weekly dashboard totals, CSV export, and email template helpers.

# RentSutra Stability Protocol

To maintain long-term reliability while rapidly iterating with AI ("vibe coding"), follow these rules:

## 1. The Stability Gate
**Command**: `npm run stability-check`

Before considering any major feature or bug fix "complete," this command **MUST** pass. It performs:
- **TypeScript Validation**: Ensures no type regressions.
- **Linting**: Maintains code quality.
- **Smoke Testing (@smoke)**: Verifies that the landing page, login, and core accessibility are still functional.

## 2. Regression Prevention
- **Add Tests for New Features**: When adding a new P0 flow, add a corresponding test in `e2e-tests/`.
- **Fix Before Feature**: If `npm run stability-check` fails, all feature work must pause until the gate is green.
- **AI Instructions**: When starting a new session with an AI agent, instruct it: *"Always run the stability-check before finishing."*

## 3. Core "Golden Paths" (@smoke)
The following flows are considered "Golden Paths" and are protected by `@smoke` tags:
- Landing page availability.
- Login page accessibility.
- [To be added] Successful owner login to dashboard.
- [To be added] Successful tenant onboarding.

---

## Technical Setup
The stability check uses **Playwright** and **Firebase Emulators**.
Ensure your local environment has:
1. `firebase-tools` installed.
2. Playwright browsers installed (`npx playwright install`).

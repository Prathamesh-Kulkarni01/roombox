# Definition of Certifiable (DoC)

Before a feature can be admitted into the RentSutra Certification Platform, it must meet all of the following criteria. This ensures that the platform has absolute control over the application's execution environment.

## 1. No Direct Infrastructure Access
The codebase must not directly instantiate database clients (e.g., `firebase.firestore()`). All infrastructure must be accessed through injected providers.

## 2. Time is Injectable
The codebase must not use `new Date()` or `Date.now()` directly for business logic. Time must be retrieved from a virtualized or injectable clock provider to allow for time-travel certification (e.g., simulating a 30-day billing cycle).

## 3. External APIs are Injectable
External integrations (e.g., WhatsApp, Stripe, Email) must not be hardcoded via `fetch` or `axios`. They must be abstracted behind providers that can be mocked or intercepted by the simulation engine.

## 4. Emits Business Events
The feature must emit immutable domain events (e.g., `RentGenerated`, `GuestCheckedIn`) to the Event Stream. The certification platform relies on these events to trace execution paths without polling databases.

## 5. Enables Business State Assertions
The feature must update Projections (Read Models) or expose a clear state that can be asserted against without relying on raw database schemas.

## 6. Deterministic Execution
Given the same initial state, seed, and inputs, the feature must always produce the exact same outcome, IDs, and timestamps.

## 7. Multi-Environment Compatibility
The feature must function identically when the infrastructure provider is swapped between Local Emulator, Standard (Shared), and Enterprise (BYOD Isolated).

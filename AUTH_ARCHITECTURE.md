# Roombox Authentication Architecture

This document outlines the current authentication and authorization architecture of the Roombox platform, specifically focusing on how it handles multi-tenant, multi-database environments.

## 1. Core Architectural Challenge: Hybrid Multi-Tenancy
Roombox supports two types of multi-tenancy:
1. **Standard Tenants (Centralized)**: Data lives in the central `roombox-prod` Firebase project.
2. **Enterprise Tenants (Isolated BYOD)**: Data lives in a completely isolated Firebase project owned by the enterprise, with a dedicated Firestore database and Identity/Auth provider.

The Auth module must seamlessly route login attempts, token generation, and client-side SDK initialization to the correct Firebase project without the end-user needing to know the difference.

---

## 2. Tenant Resolution (`src/platform/auth/server/tenant-resolver.ts`)
The tenant resolver is the absolute source of truth for determining which database and auth instance a request should operate against.

- **Subdomain Routing**: It analyzes the request host (e.g., `pg21.rentsutra.in`) to identify the `ownerId`.
- **Dynamic App Initialization**: If the tenant is an Enterprise customer, it decrypts their stored credentials (OAuth or Service Account) and initializes a dedicated Firebase Admin `App` and `Auth` instance on the fly.
- **Caching**: Enterprise app instances are cached in an LRU cache to prevent memory leaks and initialization latency on every request.

---

## 3. Login Strategies & Fallbacks

Because enterprise users have no record in the central database, authentication endpoints employ a specific "waterfall" resolution strategy:

### A. Password Login (`/api/auth/phone-login`)
1. **Central Search**: Attempts to find the user in the central `users` collection.
2. **Enterprise Search**: If not found, uses `resolveTenant` to determine if the request is on an enterprise subdomain, then searches the custom DB's `users_data/{ownerId}/guests` (or staff) collections.
3. **Validation**: Fetches the correct `clientConfig.apiKey` for the enterprise project and verifies the password using the Firebase Identity Toolkit REST API.
4. **Token Generation**: Generates a Custom JWT using the **specific enterprise Firebase Admin Auth** instance.

### B. OTP Login (`/api/auth/otp/verify`)
- OTPs are stored centrally in `system_otps`.
- Validates the OTP attempt (max 3 attempts).
- Resolves the user record (falling back to the enterprise DB if necessary).
- Enforces a **Staff Security Policy**: Administrative accounts (staff, managers) are strictly prohibited from using OTPs to log in (must use passwords), unless they are consuming a one-time setup code.

### C. Magic Links (`/api/auth/magic-login` & `/set-password`)
- Used for guest onboarding and password resets.
- If the token belongs to a sharded tenant, the system explicitly fetches the enterprise Auth instance based on the `ownerId` embedded in the token, bypassing subdomain checks (useful when links are clicked from the main domain).
- Creates the user in the enterprise Firebase Auth project and sets their password natively.

---

## 4. Client-Side State (`src/platform/auth/client/auth-context.tsx`)

The React frontend dynamically connects to the correct Firebase project:

1. **`StoreProvider`**: On mount, calls `/api/tenant-config`. If it detects an enterprise subdomain, it uses `initializeApp` to create a new Firebase client app named `tenant-login-instance` using the enterprise's custom config. It then dispatches a `tenant-app-ready` window event.
2. **`PlatformAuthProvider`**: Listens for the `tenant-app-ready` event. When fired, it swaps out the central `auth` object for the `getAuth(tenantApp)` object.
3. **Fallback Client Auth (`login-client.tsx`)**: Tries to sign in directly via the client SDK. If it encounters a `user-not-found` error (often due to race conditions where the context hasn't swapped to enterprise yet), it falls back to the server-side `/api/auth/phone-login` to get a custom token, and uses `signInWithCustomToken` on the enterprise app.

---

## 5. Authorization, Claims & Context Switching

Roombox uses **Firebase Custom Claims** embedded inside the JWT token to enforce permissions at the edge, avoiding costly database lookups on every secure request.

- **Standard Claims**: `role` (owner/tenant/staff), `guestId`, `ownerId`, `pgId`, `staffId`, and `permissions` (array).
- **Role Context Switcher**: A single user (e.g., an owner) might also have a tenant profile in another PG. The `RoleContextSwitcher` component calls `/api/auth/switch-context`, which verifies the user's secondary profiles and mints a **new** Custom Token with the swapped role and IDs, effectively switching their dashboard view without needing multiple accounts.
- **Edge Middleware (`rbac-middleware.ts`)**: Intercepts requests, parses the JWT claims, and enforces route-level access control.

# 🌐 Roombox Environment & Safe Release Guide

This guide describes how to configure, isolate, and run the different deployment environments for Roombox. By adhering to this workflow, you protect live customer databases from local code pollution and guarantee that schema updates are safely validated before moving to production.

---

## 🏗️ 1. Environment Profiles & Isolation

We have structured the environment configuration into three isolated layers:

```
                  +----------------------------------------------+
                  |               NEXT.js RUNNER                 |
                  +----------------------------------------------+
                                  |
         +------------------------+------------------------+
         |                        |                        |
         v                        v                        v
+------------------+     +------------------+     +------------------+
| LOCAL DEV        |     | CLOUD STAGING    |     | LIVE PRODUCTION  |
| .env.development |     | .env.staging     |     | .env.production  |
+------------------+     +------------------+     +------------------+
| - Local Emulators|     | - Cloud Sandbox  |     | - Live DB        |
| - Razorpay Test  |     | - Razorpay Test  |     | - Razorpay Live  |
| - Mock APIs      |     | - Sandbox APIs   |     | - Live APIs      |
+------------------+     +------------------+     +------------------+
```

### 1.1 Local Development (`.env.development`) — *Safe by Default*
*   **Target:** Firebase Emulators (Firestore: `127.0.0.1:8081`, Auth: `127.0.0.1:9099`)
*   **Payment Gateway:** Razorpay Test/Sandbox mode (`rzp_test_...`)
*   **Behavior:** When running `npm run dev`, Next.js automatically sets `NODE_ENV=development` and loads this file, ensuring that **developers can never accidentally delete or contaminate production data**.

### 1.2 Cloud Staging / QA Sandbox (`.env.staging`)
*   **Target:** A dedicated sandbox Firebase project (e.g. `roombox-staging`)
*   **Payment Gateway:** Razorpay Test/Sandbox mode (`rzp_test_...`)
*   **Behavior:** Used to test actual cloud-hosted services, deep links, webhooks, and live authentication flows before publishing to production.

### 1.3 Live Production (`.env.production`)
*   **Target:** Your live customer-facing database (`roombox-f7bff`)
*   **Payment Gateway:** Razorpay Live mode (`rzp_live_...`)
*   **Behavior:** Highly isolated. This file is loaded only during production compilation (`npm run build`) and production migration runners.

---

## 🚀 2. Run Commands & Shortcuts

We have added unified, cross-platform terminal shortcuts to your [package.json](file:///c:/A%20Projects/roombox/package.json).

### 2.1 Starting the Application
*   **Run Local Development (Safe Emulator):**
    ```bash
    npm run dev
    ```
*   **Run Dev Server pointing to Staging Sandbox:**
    ```bash
    npm run dev:staging
    ```
*   **Run Dev Server pointing to Production (Use with Caution!):**
    ```bash
    npm run dev:prod
    ```

### 2.2 Executing Migrations
*   **Migrate Local Emulator DB:**
    ```bash
    npm run migrate:local
    ```
*   **Migrate Cloud Staging DB:**
    ```bash
    npm run migrate:staging
    ```
*   **Migrate Cloud Production DB (Live Customers):**
    ```bash
    npm run migrate:prod
    ```

---

## 📋 3. Safe Release Checklist

Follow this checklist for **every release** that changes database schema, logic, or dependencies:

### 🟩 Step 1: Pre-Commit (Local Gates)
- [ ] Run typescript and lint checking:
  ```bash
  npm run typecheck && npm run lint
  ```
- [ ] Run E2E Smoke tests to ensure no regressions in user landing/authentication:
  ```bash
  npm run test:smoke
  ```
  *(Or execute `npm run stability-check` to run typechecks, linting, and smoke tests automatically).*

### 🧪 Step 2: Write & Verify Your Migration
*If your feature alters collections, adds fields, or changes defaults, you **MUST** create a schema migration script:*
- [ ] Create a typescript file in [scripts/migrations/](file:///c:/A%20Projects/roombox/scripts/migrations/) (e.g. `011_my_new_field.ts`).
- [ ] Implement the `up()` method to safely write fields (always supply safe defaults).
- [ ] Implement the `down()` method to rollback changes in case of failure.
- [ ] Validate on local emulator:
  ```bash
  # 1. Dry run check
  npm run migrate:local -- --dry-run
  
  # 2. Apply migration
  npm run migrate:local
  
  # 3. Test rollback path
  npm run migrate:local -- --rollback
  ```

### 🌩️ Step 3: Staging Release Gate
Before updating production, deploy and test on your Staging Sandbox:
- [ ] Execute staging migrations:
  ```bash
  npm run migrate:staging
  ```
- [ ] Deploy server bundle to Staging environment.
- [ ] Perform manual regression testing (e.g., test tenant onboarding and mock UPI payments).

### 🔴 Step 4: Production Release (Zero-Downtime Deployment)
Execute these steps sequentially. If a step fails, **halt immediately**:
- [ ] Run final production pre-flight checks (simulates full user flow against emulator):
  ```bash
  npm run audit
  ```
- [ ] Run production database migrations:
  ```bash
  npm run migrate:prod
  ```
  *Note: The runner will automatically lock the database, take backup snapshots of `tenants` and `properties` to `system_backups/`, verify data shapes, and execute the migrations sequentially.*
- [ ] Trigger the live server deploy (e.g. Vercel, Netlify, or Next.js build):
  ```bash
  npm run build
  ```
- [ ] Monitor real-time logs and error trackers for any `[Validation Warning]` messages from Zod parser functions.

---

## ⚡ 4. Vercel Branch-Based Automated Releases

Vercel supports branch-based environment variables natively. We have fully automated your database migrations directly during Vercel's compilation phase using [scripts/vercel-build.ts](file:///c:/A%20Projects/roombox/scripts/vercel-build.ts).

### 4.1 How it Works

When Vercel triggers a deployment, it executes `npm run build`. This script is configured to intercept the compilation and run context checks:

1.  **Production Environment (`main` branch):** 
    *   Vercel sets `VERCEL_ENV=production`.
    *   Our build orchestrator automatically triggers the database migration runner (`scripts/migrations/runner.ts`) to execute any new schema migrations against your live database using Vercel's production environment variables.
    *   Once migrations finish, it compiles the production Next.js application bundle.
2.  **Staging Environment (`staging` branch):**
    *   Vercel sets `VERCEL_ENV=preview` and `VERCEL_GIT_COMMIT_REF=staging`.
    *   The build orchestrator automatically runs migrations against your cloud staging/sandbox database.
3.  **Feature / Pull Request Branches:**
    *   Vercel sets `VERCEL_ENV=preview`.
    *   Database migrations are **skipped** to avoid polluting staging/production data with unmerged experimental features.

### 4.2 Configuring Environment Variables in Vercel

To set this up on Vercel:

1.  Go to your **Vercel Dashboard > Project Settings > Environment Variables**.
2.  Add your keys (e.g. `FIREBASE_PROJECT_ID`, `RAZORPAY_KEY_ID`, `FIREBASE_PRIVATE_KEY`).
3.  **Assign Environments and Branches:**
    *   For **Production keys** (live): Assign to the **Production** environment.
    *   For **Staging keys** (sandbox): Assign to the **Preview** environment, and select **Add Branch Limit** to restrict them specifically to the `staging` branch.
    *   For **Local mock keys**: (Optional) Assign to the **Development** environment to allow pulling them using `vercel env pull`.


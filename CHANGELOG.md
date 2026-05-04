## Version 0.17.0 (5/4/2026, 6:27:44 AM)

### 🔄 Semantic Impact Summary
```
 CHANGELOG.md | 17 +++++++++++++++++
 package.json |  2 +-
 2 files changed, 18 insertions(+), 1 deletion(-)

```

### ✨ Features
- feat: implement user state management slice and property service layer for Firebase integration
- feat: implement core dashboard components, error handling, state management, and service integration for property management.

### 📝 Other Commits
- Merge branch 'master' of https://github.com/Prathamesh-Kulkarni01/roombox


## Version 0.16.0 (5/4/2026, 3:45:59 AM)

### 🔄 Semantic Impact Summary
```
 CHANGELOG.md | 25 +++++++++++++++++++++++++
 package.json |  5 +++--
 2 files changed, 28 insertions(+), 2 deletions(-)

```

### ✨ Features
- feat: implement property service with CRUD operations, plan-based limits, and activity logging

### 📝 Other Commits
- Merge branch 'master' of https://github.com/Prathamesh-Kulkarni01/roombox


## Version 0.15.0 (5/3/2026, 6:28:50 PM)

### 🔄 Semantic Impact Summary
```
 scripts/verify-system-integrity.ts | 151 +++++++++++++++++++++++++++++++++++++
 1 file changed, 151 insertions(+)

```

### ✨ Features
- feat: add script to verify system schema integrity and detect orphaned records
- feat: implement landing page with feature showcase and savings calculator support
- feat: implement landing page with feature showcase and add translation utilities
- feat: implement comprehensive billing and wallet ledger system
- feat: implement administrative dashboards, billing constants, payouts, and automated testing suite
- feat: implement wallet system with subscription gating, billing automation, and KYC management features
- feat: implement property management API and build profile completion onboarding components

### 📝 Other Commits
- chore: update package-lock.json dependencies
- Merge branch 'master' of https://github.com/Prathamesh-Kulkarni01/roombox
- feat(dashboard): enhance payment settings validation UI and fix smoke test ports
- cleanup: remove temporary scratch files and verification scripts


## Version 0.14.0 (5/1/2026, 1:06:41 PM)

### 🔄 Semantic Impact Summary
```
 CHANGELOG.md | 23 +++++++++++++++++++++++
 package.json |  2 +-
 2 files changed, 24 insertions(+), 1 deletion(-)

```

### ✨ Features
- feat: implement centralized TenantService and automated rent reminder workflows

### 📝 Other Commits
- Merge branch 'master' of https://github.com/Prathamesh-Kulkarni01/roombox
- chore: stabilize e2e auth tests, fix duplicate state entries, and enforce auth headers


## Version 0.13.0 (4/29/2026, 1:35:16 PM)

### 🔄 Semantic Impact Summary
```
 e2e-tests/seed-utils.ts                            |   3 +-
 .../specs/e2e/auth/auth-onboarding-robust.spec.ts  |  97 +++
 e2e-tests/specs/e2e/auth/auth-signup.spec.ts       |  62 +-
 firestore.rules                                    |  16 +-
 playwright.config.ts                               |   2 +-
 src/app/complete-profile/page.tsx                  | 793 ++++++++++++++++++++-
 src/app/dashboard/layout.tsx                       |   2 +
 src/app/login/page.tsx                             |  12 +-
 src/app/signup/page.tsx                            |  79 +-
 src/components/StoreProvider.tsx                   |  26 +-
 src/lib/slices/userSlice.ts                        |  39 +-
 11 files changed, 1028 insertions(+), 103 deletions(-)

```

### ✨ Features
- feat: implement user onboarding flow with property setup wizard and associated e2e tests


## Version 0.12.0 (4/22/2026, 11:27:04 AM)

### 🔄 Semantic Impact Summary
```
 CHANGELOG.md | 18 ++++++++++++++++++
 package.json |  2 +-
 2 files changed, 19 insertions(+), 1 deletion(-)

```

### ✨ Features
- feat: implement comprehensive E2E and integration testing suite with automated workflows, security assertions, and Firestore emulator helpers.
- feat: add end-to-end authentication setup and multi-role test utilities
- feat: implement KYC document upload page with camera integration and submission logic
- feat: implement dashboard hook, state management, and UI components for guest and property administration
- feat: implement dashboard infrastructure, service layers, and service worker caching support
- feat: implement service worker caching, tenant management dashboard, and permission-based UI components

### 📝 Other Commits
- Merge branch 'master' of https://github.com/Prathamesh-Kulkarni01/roombox
- integrate: breachme
- del: Remove obsolete project files


## Version 0.11.0 (4/13/2026, 6:29:20 PM)

### 🔄 Semantic Impact Summary
```
 CHANGELOG.md | 19 +++++++++++++++++++
 package.json |  2 +-
 2 files changed, 20 insertions(+), 1 deletion(-)

```

### ✨ Features
- feat: implement identity-first adaptive authentication flow with multi-role context switching
- feat: implement identity-first adaptive authentication page with multi-role context switching

### 📝 Other Commits
- Merge branch 'master' of https://github.com/Prathamesh-Kulkarni01/roombox


## Version 0.10.0 (4/13/2026, 5:42:06 PM)

### 🔄 Semantic Impact Summary
```
 CHANGELOG.md | 15 +++++++++++++++
 package.json |  2 +-
 2 files changed, 16 insertions(+), 1 deletion(-)

```

### ✨ Features
- feat: implement secure OTP authentication flow with staff role enforcement and multi-role context switching
- feat: implement multi-role context switching, RBAC middleware, and automated security audit workflows for API routes.
- feat: implement service worker for offline support and add staff management service

### 📝 Other Commits
- Merge branch 'master' of https://github.com/Prathamesh-Kulkarni01/roombox


## Version 0.9.0 (4/12/2026, 11:50:03 AM)

### 🔄 Semantic Impact Summary
```
 CHANGELOG.md | 17 +++++++++++++++++
 package.json |  2 +-
 2 files changed, 18 insertions(+), 1 deletion(-)

```

### 📝 Other Commits
- Merge branch 'master' of https://github.com/Prathamesh-Kulkarni01/roombox
- refactor: add API route to generate and set tenant passwords in Firebase Auth


## Version 0.8.0 (4/12/2026, 11:40:52 AM)

### 🔄 Semantic Impact Summary
```
 CHANGELOG.md | 17 +++++++++++++++++
 package.json |  2 +-
 2 files changed, 18 insertions(+), 1 deletion(-)

```

### ✨ Features
- feat: initialize GSD template framework and implement core dashboard and payment services

### 📝 Other Commits
- Merge branch 'master' of https://github.com/Prathamesh-Kulkarni01/roombox


## Version 0.7.0 (4/9/2026, 7:56:01 PM)

### 🔄 Semantic Impact Summary
```
 CHANGELOG.md | 23 +++++++++++++++++++++++
 package.json |  2 +-
 2 files changed, 24 insertions(+), 1 deletion(-)

```

### ✨ Features
- feat: implement magic link password setup flow and add tenant management detail page

### 📝 Other Commits
- Merge branch 'master' of https://github.com/Prathamesh-Kulkarni01/roombox


## Version 0.6.0 (4/9/2026, 6:44:19 PM)

### 🔄 Semantic Impact Summary
```
 src/app/api/staff/manage/route.ts | 10 ++++++----
 src/lib/slices/staffSlice.ts      | 21 ++++++++++++++++++---
 2 files changed, 24 insertions(+), 7 deletions(-)

```

### ✨ Features
- feat: implement staff management Redux slice and API route for CRUD operations
- feat: implement smart-router to manage workflow navigation and session state for WhatsApp bot
- feat: implement WhatsApp bot infrastructure with smart routing, session management, and load simulation testing
- feat: add database migrations for staff structure updates and payment status fields
- feat: define core domain models and initialize tenant service for PG management
- feat: implement header component, app state management, and staff management dashboard pages

### 📝 Other Commits
- Implement audit logging and refactor service layer
- Implement effective owner ID for staff management


## Version 0.5.0 (4/9/2026, 2:57:39 PM)

### 🔄 Semantic Impact Summary
```
 CHANGELOG.md | 23 +++++++++++++++++++++++
 package.json |  2 +-
 2 files changed, 24 insertions(+), 1 deletion(-)

```

### ✨ Features
- feat: implement multi-tenant Firebase architecture, role-based access control (RBAC), and route protection middleware
- feat: implement magic link authentication and tenant management dashboard functionality
- feat: implement centralized TenantService and add staff management dashboard and API routes
- feat: implement staff management system with magic link invitations and mobile-responsive dashboard navigation
- feat: implement website builder dashboard with subdomain configuration and dynamic site rendering

### 📝 Other Commits
- Merge branch 'master' of https://github.com/Prathamesh-Kulkarni01/roombox


## Version 0.4.0 (3/30/2026, 4:20:35 PM)

### 🔄 Semantic Impact Summary
```
 src/components/header.tsx                |   1 +
 src/context/language-context.tsx         |   4 +-
 src/lib/translations.ts                  | 193 +++++++++++++++++++++++++++++++
 src/lib/whatsapp/smart-router.ts         |   1 +
 src/lib/whatsapp/translations-wa.ts      |  62 ++++++++++
 src/lib/whatsapp/workflow-definitions.ts |  80 ++++++++++---
 src/lib/whatsapp/workflow-engine.ts      |  32 +++--
 src/lib/whatsapp/workflow-types.ts       |   5 +-
 src/services/staffService.ts             |   5 +-
 src/services/tenantService.ts            |  21 ++--
 tmp/verify-fix.ts                        |  35 ++++++
 11 files changed, 403 insertions(+), 36 deletions(-)

```

### ✨ Features
- feat: implement declarative WhatsApp workflow engine with language support and role-based access control


## Version 0.3.0 (3/28/2026, 9:06:46 AM)

### 🔄 Semantic Impact Summary
```
 CHANGELOG.md | 16 ++++++++++++++++
 package.json |  2 +-
 2 files changed, 17 insertions(+), 1 deletion(-)

```

### ✨ Features
- feat: implement StoreProvider for centralized auth, data synchronization, and routing, and add changelog page

### 📝 Other Commits
- Merge branch 'master' of https://github.com/Prathamesh-Kulkarni01/roombox


## Version 0.2.0 (3/28/2026, 8:57:27 AM)

### 🔄 Semantic Impact Summary
```
 src/app/changelog/page.tsx | 245 +++++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 245 insertions(+)

```

### ✨ Features
- feat: implement dynamic changelog page with markdown parsing and visual timeline
- feat: implement dashboard dialog components and modals for guest management, subscriptions, and property configuration
- feat: implement guest management and payment processing dialogs with supporting API routes and state slices
- feat: implement automated CI/CD pipeline with semantic release management and deployment orchestration


## Version 0.1.0 (3/28/2026, 7:51:42 AM)

### 🔄 Semantic Impact Summary
```
 .github/workflows/intelligent-release.yml | 16 ++++++++++++----
 scripts/ci/release-manager.ts             | 22 ++++++++++++++--------
 2 files changed, 26 insertions(+), 12 deletions(-)

```

### ✨ Features
- feat: implement automated semantic release pipeline with intelligent versioning and migration validation
- feat: add CI/CD release workflow, service worker, and Redux slices for guests and property management
- feat: add automated CI/CD pipeline for validation, semantic release, and deployment
- feat: implement CI/CD pipeline for automated validation, semantic release management, and production deployment
- feat: add intelligent release and deployment GitHub Actions workflow
- feat: add API endpoints for manual payment mapping and tenant-initiated transaction confirmation
- feat: implement database migration framework and automated release management workflow
- feat: implement comprehensive dashboard, payment tracking, and tenant management features
- feat: Implement a comprehensive tenant management system including onboarding, payment processing, and end-to-end tests.
- feat: implement core PG management features including authentication, payments, tenant management, and data types
- feat: Add property creation sheet with auto-setup, new API endpoints, and foundational service layers for properties, staff, and tenants.
- feat: Implement bulk property setup feature with new modal, API route, and property services.
- feat: Implement staff management with OTP authentication and granular permissions, introducing new API routes and data types.
- feat: Implement a comprehensive dashboard for tenant and property management, including guest lifecycle, rent passbook, payment processing, and ledger reconciliation.
- feat: Add a Redis connection test script and enhance Firestore guest collection group indexes with a new phone field index.
- feat: Add root layout with metadata, theme, language providers, and Vercel Analytics integration.
- feat: Add Cloudinary integration for image uploads and a service worker for PWA caching.
- feat: Implement guest onboarding with detailed financial options and payment dialog, alongside new financial reconciliation and system audit scripts.

### 📝 Other Commits
- chore: update package-lock.json dependencies
- ci: add automated release and deployment workflow and update local migration script to use npm



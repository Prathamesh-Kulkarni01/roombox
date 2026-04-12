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



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



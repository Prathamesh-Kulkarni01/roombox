git checkout --orphan clean_history
git reset -q

git add package.json package-lock.json pnpm-lock.yaml tsconfig.json .gitignore .vscode/
git commit -m "chore(config): initialize project and dependencies"

git add tailwind.config.ts postcss.config.mjs components.json src/app/globals.css src/app/layout.tsx public/
git commit -m "chore(style): setup Tailwind and global assets"

git add src/lib/firebase* firestore.rules
git commit -m "feat(db): establish Firebase connection and security rules"

git add src/lib/types* src/lib/mock-data* src/lib/blog-data.ts
git commit -m "feat(core): define global typescript interfaces and core logic"

git add src/lib/store.ts src/lib/slices/ src/lib/hooks.ts src/lib/utils.ts
git commit -m "feat(store): configure global state management and utilities"

git add src/components/
git commit -m "feat(ui): implement reusable component library"

git add src/lib/actions/ src/app/api/ src/lib/reconciliation.ts src/lib/reminder-logic.ts src/lib/permissions.ts src/lib/notifications.ts
git commit -m "feat(api): create automated backend logic and background jobs"

git add src/app/dashboard/ src/app/admin/
git commit -m "feat(dashboard): build owner dashboard and visual property views"

git add src/app/tenants/ src/app/pay/ src/app/payouts/
git commit -m "feat(tenant): build tenant self-service portal workflows"

git add .
git commit -m "feat: finalize application routes, public pages, and PWA configurations"

git log --oneline

/**
 * scripts/vercel-build.ts
 * 
 * Orchestrates branch-based and environment-based deployments on Vercel:
 * 1. Checks VERCEL_ENV and VERCEL_GIT_COMMIT_REF.
 * 2. Runs schema migrations automatically on Production (main branch) and Staging (staging branch).
 * 3. Compiles the Next.js application.
 */

import { execSync } from 'child_process';

const vercelEnv = process.env.VERCEL_ENV; // 'production' | 'preview' | 'development'
const branch = process.env.VERCEL_GIT_COMMIT_REF || '';

console.log(`\n--- 🏗️ VERCEL BRANCH-BASED DEPLOYMENT GATE ---`);
console.log(`Vercel Env:   ${vercelEnv || 'Not running in Vercel (Local Build)'}`);
console.log(`Git Branch:   ${branch || 'Unknown'}`);

try {
  // 1. Determine environment and run migrations
  if (vercelEnv === 'production') {
    console.log('\n🚀 Production build detected. Executing database migrations...');
    // In Vercel, the matching environment variables are loaded directly from the Vercel dashboard.
    // We execute the standard migration runner using the currently injected environment variables.
    execSync('npx ts-node --project scripts/tsconfig.json -r tsconfig-paths/register scripts/migrations/runner.ts', { stdio: 'inherit' });
  } else if (vercelEnv === 'preview' && branch === 'staging') {
    console.log('\n🧪 Staging branch preview build detected. Executing staging migrations...');
    execSync('npx ts-node --project scripts/tsconfig.json -r tsconfig-paths/register scripts/migrations/runner.ts', { stdio: 'inherit' });
  } else {
    console.log('\n⏭️ Normal Preview deployment / Feature branch. Skipping live migrations.');
  }

  // 2. Execute actual compilation
  console.log('\n🔨 Building Next.js production bundle...');
  execSync('npm run build:sw && next build --webpack', { stdio: 'inherit' });
  console.log('\n✨ Vercel release gate passed. Build completed successfully.');
} catch (error) {
  console.error('\n❌ Vercel build gate failed during compilation or migration:', error);
  process.exit(1);
}

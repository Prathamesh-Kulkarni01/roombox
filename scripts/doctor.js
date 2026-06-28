const { execSync } = require('child_process');
const fs = require('fs');

console.log("🩺 Running Developer Quality Gate (Doctor)...\n");

let allPassed = true;

function check(name, command) {
    process.stdout.write(`Checking ${name}... `);
    try {
        if (typeof command === 'function') {
            command();
        } else {
            execSync(command, { stdio: 'ignore' });
        }
        console.log("✅");
    } catch (e) {
        console.log("❌");
        allPassed = false;
        console.error(`   Error in ${name}:`, e.message || e);
    }
}

// 1. Node Version
check("Node version", () => {
    const v = process.version;
    if (!v.startsWith('v20') && !v.startsWith('v22') && !v.startsWith('v18')) {
        console.warn(`\n   Warning: Node version is ${v}. Expected v18, v20, or v22.`);
    }
});

// 2. npm version (user requested pnpm, but we use npm/package-lock)
check("npm version", "npm -v");

// 3. Environment Variables
check("Environment variables", () => {
    if (!fs.existsSync('.env.e2e')) {
        throw new Error("Missing .env.e2e file");
    }
});

// 4. Playwright browsers
check("Playwright browsers", "npx playwright install --dry-run");

// 5. TypeScript
check("TypeScript", "npx tsc --noEmit");

// 6. Vitest
check("Vitest", "npx vitest run --passWithNoTests");

// 7. Lint
check("Lint", "npm run lint");

// 8. Build
check("Next.js Build", () => {
    // We do a dry run or just check if it builds. But full build is slow (91s).
    // Let's just run typecheck + lint which covers 90% of build errors for a quick doctor,
    // or actually run next build. The user said: "Every PR should automatically run: ... pnpm build".
    // We'll just ensure next is installed for doctor, but maybe skip full build for the fast doctor script?
    // User requested "Build" in the doctor. Let's do it but warn it might be slow.
    execSync("npx next build", { stdio: 'ignore' });
});

console.log("\n------------------------------------------------");
if (allPassed) {
    console.log("🎉 All checks passed! Your environment is ready.");
    process.exit(0);
} else {
    console.log("⚠️ Some checks failed. Please fix the issues above before committing.");
    process.exit(1);
}

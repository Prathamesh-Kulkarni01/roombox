import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: './e2e-tests',
    /* Run tests in files in parallel */
    fullyParallel: false,
    /* Fail the build on CI if you forgot to edit your test files */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: 1,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [['html'], ['list']],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: 'http://localhost:9002',

        /* Collect trace when retrying a failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },

    /* Configure projects for major browsers */
    projects: [
        // ── Auth Setup ────────────────────────────────────────────────
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
        },

        // ── Chromium (all tests except specific ones if any) ───────────
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // Individual tests will specify their storageState if needed
            },
            dependencies: ['setup'],
        },
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:9002',
        reuseExistingServer: true,
        timeout: 120000,
    },
});

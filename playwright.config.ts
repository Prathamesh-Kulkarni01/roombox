import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e-tests',
    fullyParallel: false,   // serial — WA tests depend on session state
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,             // single worker to avoid session conflicts
    reporter: [['html'], ['list']],

    use: {
        baseURL: 'http://localhost:9002',
        trace: 'on-first-retry',
        headless: false,
        video: 'on',        // record all tests
        screenshot: 'on',
    },

    projects: [
        // ── Auth Setup ────────────────────────────────────────────────
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
        },

        // ── WhatsApp Bot E2E (no browser auth needed for webhook calls) ──
        {
            name: 'whatsapp-bot',
            testMatch: /whatsapp-bot\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                // Reuse saved auth if available, otherwise tests self-login
                storageState: 'playwright/.auth/user.json',
            },
            dependencies: ['setup'],
        },

        // ── General UI Tests ──────────────────────────────────────────
        {
            name: 'chromium',
            testIgnore: /whatsapp-bot\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'playwright/.auth/user.json',
            },
            dependencies: ['setup'],
        },
    ],

    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:9002',
        reuseExistingServer: true,   // always reuse if already running
        timeout: 120 * 1000,
    },

    outputDir: 'test-results',
});

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';

// Read from .env.e2e file for consistent emulator project configuration
dotenv.config({ path: path.resolve(__dirname, '.env.e2e'), override: true });

// Force 'roombox-test' for E2E tests to ensure we ALWAYS use the emulator project
const TEST_PROJECT_ID = 'roombox-test';
process.env.FIREBASE_PROJECT_ID = TEST_PROJECT_ID;
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = TEST_PROJECT_ID;


/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: './e2e-tests',
    timeout: 180 * 1000,
    /* Run tests in files in parallel */
    fullyParallel: true,
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
        baseURL: 'http://localhost:9003',

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
            // dependencies: ['setup'],
            use: {
                ...devices['Desktop Chrome'],
                // Individual tests will specify their storageState if needed
            },
        },
    ],

    /* Run your local dev server and emulators before starting the tests */
    webServer: [
        {
            // Start emulators using the project ID from .env
            command: `npx firebase emulators:start --only firestore,auth --project ${process.env.FIREBASE_PROJECT_ID || 'roombox-test'}`,
            port: 8081,
            reuseExistingServer: true,
            timeout: 240000,
        },
        {
            command: process.env.CI 
                ? 'npx next dev -p 9003' 
                : 'npx next dev --turbopack -p 9003',
            url: 'http://127.0.0.1:9003',
            reuseExistingServer: !process.env.CI,
            timeout: 600000, // 10 minutes for slow CI build
            env: {
                PORT: '9003',
                NEXT_DIST_DIR: '.next-test',
                // Dummy Firebase config for test environment to prevent cloud connections
                NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyDummyKey_1234567890',
                NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'roombox-test.firebaseapp.com',
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: TEST_PROJECT_ID,
                NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'roombox-test.appspot.com',
                NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
                NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:abcdef123456',
                NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: 'G-DUMMY',
                
                // Emulator hosts
                NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: '127.0.0.1:8081',
                NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
                FIRESTORE_EMULATOR_HOST: '127.0.0.1:8081',
                FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
                
                // Project IDs
                FIREBASE_PROJECT_ID: TEST_PROJECT_ID,
                
                // App URLs
                NEXT_PUBLIC_APP_URL: 'http://localhost:9003',
                NEXT_PUBLIC_SITE_DOMAIN: 'http://localhost:9003',
            }
        }
    ],
});

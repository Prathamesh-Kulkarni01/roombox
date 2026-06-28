import { FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';

async function globalSetup(config: FullConfig) {
  // Load .env.e2e for playwright tests
  dotenv.config({ path: path.resolve(__dirname, '../../.env.e2e'), override: true });

  console.log('--- Playwright Global Setup ---');
  // E.g., You can authenticate a test user here and save storage state
  // Or seed the emulator with initial state
  console.log('Global setup complete');
}

export default globalSetup;

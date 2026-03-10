import { getAdminDb } from '../src/lib/firebaseAdmin';
import { TenantService } from '../src/services/tenantService';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function gen() {
    const db = await getAdminDb();
    const link = await TenantService.generateMagicLink(db, 'test-guest-e2e', '+919876543210', 'test-owner', 'E2E PG');
    console.log('E2E_LINK:', link);
}
gen();

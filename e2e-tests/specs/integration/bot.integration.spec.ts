import { test, expect } from '@playwright/test';
import { DbHelper } from '../../api/db';
import { ContextFactory } from '../../../src/tests/factories/contextFactory';

/**
 * WhatsApp Bot Integration Tests
 * Verified via direct API webhooks and Firestore assertions. 
 * ZERO browser overhead.
 */

const WEBHOOK_URL = `/api/whatsapp/webhook`;

function buildPayload(from: string, text: string) {
    return {
        object: 'whatsapp_business_account',
        entry: [{
            id: 'ENTRY_ID',
            changes: [{
                value: {
                    messaging_product: 'whatsapp',
                    messages: [{
                        id: `msg_${Date.now()}_${Math.random()}`,
                        from: from.replace(/\+/g, ''), // API expects digits only
                        text: { body: text },
                        type: 'text'
                    }]
                },
                field: 'messages'
            }]
        }]
    };
}

test.describe('WhatsApp Bot Integration (Parallel-Safe)', () => {
    let context: any;
    const db = new DbHelper();
    const factory = new ContextFactory();

    test.beforeAll(async () => {
        // Seed unique owner and PG for this test file
        context = await factory.createFullContext();
        console.log(`[Integ] Seeded Context for Phone: ${context.phone}`);
    });

    test.beforeEach(async ({ request }) => {
        // Reset session for this specific phone
        await request.post(`${WEBHOOK_URL}?clear_session=${context.phone.replace(/\+/g, '')}`);
    });

    test('Flow: Add New Property via Bot', async ({ request }) => {
        const propName = `WA_INTEG_${Date.now()}`;
        const phone = context.phone.replace(/\+/g, '');
        
        // Linear conversation flow via API
        await request.post(WEBHOOK_URL, { data: buildPayload(phone, 'Hi') });
        await request.post(WEBHOOK_URL, { data: buildPayload(phone, '1') }); // View Properties
        await request.post(WEBHOOK_URL, { data: buildPayload(phone, '1') }); // Add New
        await request.post(WEBHOOK_URL, { data: buildPayload(phone, propName) });
        await request.post(WEBHOOK_URL, { data: buildPayload(phone, '10') }); // Beds
        await request.post(WEBHOOK_URL, { data: buildPayload(phone, 'Location X') });
        await request.post(WEBHOOK_URL, { data: buildPayload(phone, '8000') }); // Rent
        await request.post(WEBHOOK_URL, { data: buildPayload(phone, '25') }); // Deposit
        await request.post(WEBHOOK_URL, { data: buildPayload(phone, '1') }); // Confirm

        // Assertion: Verified at the source
        const prop = await db.getPropertyByName(context.ownerId, propName);
        expect(prop).not.toBeNull();
        expect(prop?.totalBeds).toBe(10);
        console.log(`✅ Bot Integration: Property ${propName} created and verified in Firestore.`);
    });

    test('Flow: Identity-First Auto Login', async ({ request }) => {
        const phone = context.phone.replace(/\+/g, '');
        const res = await request.post(WEBHOOK_URL, { 
            data: buildPayload(phone, 'Hi') 
        });
        expect(res.status()).toBe(200);
    });
});

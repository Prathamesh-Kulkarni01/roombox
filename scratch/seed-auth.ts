import { getAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase-admin/app';

async function verifyAndSeed() {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
    process.env.FIREBASE_PROJECT_ID = 'roombox-test';

    initializeApp({ projectId: 'roombox-test' });
    const auth = getAuth();

    const email = 'bot_tester_9@roombox.app';
    const password = 'Password123!';
    const uid = 'YJdln9goSTMiH9fGXTA1QuHdXC62';

    try {
        const user = await auth.getUser(uid);
        console.log(`User ${email} (${uid}) exists.`);
    } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
            console.log(`User ${email} MISSING. Creating...`);
            await auth.createUser({
                uid,
                email,
                password,
                emailVerified: true
            });
            console.log(`User ${email} created successfully.`);
        } else {
            console.error('Error checking user:', err);
        }
    }

    const tenantPhone = '9876543219';
    const tenantPassword = 'Password123!';
    try {
        const tenant = await auth.getUserByPhoneNumber(`+91${tenantPhone}`);
        console.log(`Tenant ${tenantPhone} exists.`);
    } catch (err: any) {
        console.log(`Tenant ${tenantPhone} MISSING. Creating...`);
        await auth.createUser({
            phoneNumber: `+91${tenantPhone}`,
            password: tenantPassword,
        });
        console.log(`Tenant ${tenantPhone} created successfully.`);
    }
}

verifyAndSeed().catch(console.error);

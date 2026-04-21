import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIREBASE_PROJECT_ID = 'roombox-test';

const app = initializeApp({ projectId: 'roombox-test' });
const auth = getAuth(app);

async function checkUser() {
    try {
        const user = await auth.getUserByEmail('bot_tester_9@roombox.app');
        console.log('User found:', user.uid);
    } catch (e: any) {
        console.log('User NOT found:', e.code);
        if (e.code === 'auth/user-not-found') {
            console.log('Creating user...');
            await auth.createUser({
                email: 'bot_tester_9@roombox.app',
                password: 'Password123!',
                uid: 'YJdln9goSTMiH9fGXTA1QuHdXC62' 
            });
            console.log('User created.');
        }
    }
}

checkUser();

import { getAdminAuth } from '../src/lib/firebaseAdmin';

async function check() {
    const auth = await getAdminAuth();
    const uid = 'staff-9999999999';
    try {
        const user = await auth.getUser(uid);
        console.log('User found:', JSON.stringify(user, null, 2));
    } catch (err: any) {
        console.log('User not found or error:', err.code || err.message);
    }
    
    try {
        const userByPhone = await auth.getUserByPhoneNumber('+919999999999');
        console.log('User by phone found:', JSON.stringify(userByPhone, null, 2));
    } catch (err: any) {
        console.log('User by phone not found:', err.code || err.message);
    }
}

check();

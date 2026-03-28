
import { getAdminDb } from '../src/lib/firebaseAdmin';

async function addCredits() {
    const ownerId = 'zz2JZjMzJ0RWjatdZxz7ApjuvP72';
    console.log('Targeting Owner:', ownerId);
    
    try {
        const db = await getAdminDb();
        const ownerRef = db.collection('users').doc(ownerId);
        
        const doc = await ownerRef.get();
        if (!doc.exists) {
            console.error('Owner document not found!');
            return;
        }

        const currentCredits = doc.data()?.subscription?.whatsappCredits || 0;
        console.log('Current Credits:', currentCredits);

        await ownerRef.update({
            'subscription.whatsappCredits': 100
        });
        
        console.log('Successfully updated credits to 100 for owner:', ownerId);
    } catch (error) {
        console.error('Failed to update credits:', error);
    }
}

addCredits().catch(console.error);

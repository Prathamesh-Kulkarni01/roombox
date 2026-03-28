
const { getAdminDb } = require('./src/lib/firebaseAdmin');

async function addCredits() {
    process.env.FIRESTORE_EMULATOR_HOST = ''; // Ensure we're NOT using emulator if the server is remote
    const db = await getAdminDb();
    const ownerId = 'zz2JZjMzJ0RWjatdZxz7ApjuvP72';
    const ownerRef = db.collection('users').doc(ownerId);
    
    await ownerRef.update({
        'subscription.whatsappCredits': 50
    });
    console.log('Successfully added 50 credits to owner:', ownerId);
}

addCredits().catch(console.error);

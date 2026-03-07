const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '');

admin.initializeApp({
    credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
    }),
});

const db = admin.firestore();

async function check(query) {
    console.log(`Checking for: ${query}`);
    const snapshot = await db.collection('users').get();
    const results = [];
    snapshot.forEach(doc => {
        const d = doc.data();
        const n = d.name || '';
        const p = d.phone || '';
        if (n.toLowerCase().includes(query.toLowerCase()) || p.includes(query)) {
            results.push({
                id: doc.id,
                name: n,
                phone: `[${p}]`, // Wrapping in brackets to see spaces clearly
                role: d.role,
                pendingVerificationPhone: d.pendingVerificationPhone
            });
        }
    });
    console.log(JSON.stringify(results, null, 2));
}

check('9359998566').then(() => check('Pooja')).catch(console.error);

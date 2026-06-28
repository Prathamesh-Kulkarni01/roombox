require('dotenv').config({ path: '.env.production' });
const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/"/g, '')
    }),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

const db = admin.firestore();

async function run() {
  const usersSnap = await db.collection('users').get();
  console.log(`Total users: ${usersSnap.size}`);
  usersSnap.forEach(doc => {
    const data = doc.data();
    if (data.subscription?.enterpriseProject) {
      console.log(`User ${doc.id} HAS enterprise project. projectId: ${data.subscription.enterpriseProject.projectId}`);
      if (!data.subscription.enterpriseProject.oauthTokens) {
        console.log(`  --> User ${doc.id} IS MISSING oauthTokens!!!`);
      }
    }
  });
}

run().catch(console.error);

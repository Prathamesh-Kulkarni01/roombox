
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Set up for emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const app = initializeApp({
  projectId: 'roombox-f7bff'
});

const db = getFirestore(app);

async function getLatestMagicLink(phone) {
  // standardized phone check
  const cleanPhone = phone.replace(/\D/g, '');
  const variations = [
    cleanPhone,
    `+91${cleanPhone}`,
    `91${cleanPhone}`
  ];

  console.log(`Searching for phone variations: ${variations.join(', ')}`);

  const linksRef = db.collection('magic_links');
  const snapshot = await linksRef
    .where('phone', 'in', variations)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.log('No magic link found for phone:', phone);
    process.exit(1);
  }

  const data = snapshot.docs[0].data();
  console.log(JSON.stringify({
    token: data.token,
    inviteCode: data.inviteCode,
    magicLink: `http://localhost:3000/invite/${data.token}` // Assuming local dev URL
  }));
}

const phoneArg = process.argv[2];
if (!phoneArg) {
  console.error('Phone number required');
  process.exit(1);
}

getLatestMagicLink(phoneArg).catch(err => {
  console.error(err);
  process.exit(1);
});


const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const templatePath = path.resolve(process.cwd(), 'public', 'firebase-messaging-sw.js.template');
const outputPath = path.resolve(process.cwd(), 'public', 'firebase-messaging-sw.js');

try {
  if (!fs.existsSync(templatePath)) {
    console.warn(`Template file not found at: ${templatePath}. Skipping service worker build.`);
    if (!fs.existsSync(outputPath)) {
      fs.writeFileSync(outputPath, '// Service worker template not found.');
    }
    process.exit(0);
  }

  const swTemplate = fs.readFileSync(templatePath, 'utf8');

  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };
  
  if (!config.apiKey || config.apiKey.includes('your-')) {
    console.warn('Firebase config not found or is a placeholder in .env file. Service worker will not be configured correctly.');
    fs.writeFileSync(outputPath, '// Firebase messaging service worker - waiting for valid config in .env file');
    process.exit(0);
  }
  
  const swContent = swTemplate.replace(
    'const firebaseConfig = {}', 
    `const firebaseConfig = ${JSON.stringify(config, null, 2)}`
  );

  fs.writeFileSync(outputPath, swContent);

  console.log('Firebase messaging service worker built successfully.');
} catch (error) {
  console.error('Error building Firebase service worker:', error);
  process.exit(1);
}

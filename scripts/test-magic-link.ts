import * as admin from 'firebase-admin';

// Initialize firebase admin
const serviceAccount = require('./serviceAccountKey.json'); // We need to check where serviceAccount is
// Wait, we can just run ts-node inside next.js environment if possible...

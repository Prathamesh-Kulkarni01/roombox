export class DbHelpers {
  static async clearFirestore() {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'roombox-test';
    const host = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8081';
    try {
      await fetch(`http://${host}/emulator/v1/projects/${projectId}/databases/(default)/documents`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('Could not clear Firestore emulator. Is it running?');
    }
  }

  static async seed(collection: string, docId: string, data: any) {
    // Basic seeder stub for when Firebase Admin is initialized in tests
    console.log(`Seeding ${collection}/${docId} with`, data);
  }
}

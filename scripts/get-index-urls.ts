import * as fs from 'fs';
import * as path from 'path';
import open from 'open';

async function generateIndexUrls() {
    let projectId: string | undefined;
    const envPath = path.join(process.cwd(), '.env');

    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/^FIREBASE_PROJECT_ID=(.*)$/m);
        if (match && match[1]) {
            projectId = match[1].trim();
        }
    }

    if (!projectId) {
        projectId = process.env.FIREBASE_PROJECT_ID;
    }

    if (!projectId) {
        projectId = 'roombox-f7bff';
    }

    console.log(`Detected Firebase Project: ${projectId}`);

    const url =
        `https://console.firebase.google.com/project/${projectId}/firestore/indexes` +
        `?create_composite=Cm1wcm9qZWN0cy8${projectId}`;

    console.log("Opening Firebase Index page...");

    await open(url);

    console.log("If browser did not open, visit:");
    console.log(url);
}

generateIndexUrls().catch(console.error);
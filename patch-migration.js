const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'scripts/migrations/002_migrate_to_event_ledger.ts');
let content = fs.readFileSync(file, 'utf8');
content = `import { FieldValue } from 'firebase-admin/firestore';\n` + content;
content = content.replace(/adminDb\.FieldValue \? adminDb\.FieldValue\.delete\(\) : null/g, "FieldValue.delete()");
fs.writeFileSync(file, content, 'utf8');

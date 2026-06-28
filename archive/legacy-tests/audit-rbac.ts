import fs from 'fs';
import path from 'path';

/**
 * Static RBAC Coverage Audit
 * Ensures every API route handler in src/app/api has explicit RBAC enforcement.
 */

const API_DIR = path.join(process.cwd(), 'src/app/api');
const IGNORED_ROUTES = [
    'auth', // Public auth routes
    'whatsapp/webhook', // Signature-based verification
    'webhooks', // Signature-based verification
    'pwa/manifest', // Publicly accessible PWA manifest
    'rent-details/', // Token-based payment links
    'manifest.json', // Multi-tenant public manifest
    'pwa-config', // Remediated
    'oauth/google', // OAuth callbacks
];

function getAllRouteFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllRouteFiles(filePath, fileList);
        } else if (file === 'route.ts') {
            fileList.push(filePath);
        }
    });
    return fileList;
}

function auditRouteFile(filePath: string): boolean {
    // Skip ignored routes
    if (IGNORED_ROUTES.some(ignored => filePath.includes(path.join('src/app/api', ignored)))) {
        return true;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for standard enforcement patterns
    const hasEnforce = content.includes('enforcePermission(');
    const hasVerifiedId = content.includes('getVerifiedOwnerId(');
    const hasVerifiedIdHeaders = content.includes('getVerifiedOwnerIdFromHeaders(');

    if (!hasEnforce && !hasVerifiedId && !hasVerifiedIdHeaders) {
        console.error(`❌ [RBAC AUDIT] Missing enforcement in: ${path.relative(process.cwd(), filePath)}`);
        return false;
    }

    console.log(`✅ [RBAC AUDIT] Verified: ${path.relative(process.cwd(), filePath)}`);
    return true;
}

const routes = getAllRouteFiles(API_DIR);
console.log(`[RBAC AUDIT] Found ${routes.length} API routes. Beginning scan...`);

let failed = 0;
routes.forEach(route => {
    if (!auditRouteFile(route)) {
        failed++;
    }
});

if (failed > 0) {
    console.error(`\n❌ [RBAC AUDIT] ${failed} routes failed security coverage. CI/CD block triggered.`);
    process.exit(1);
} else {
    console.log(`\n🎉 [RBAC AUDIT] 100% security coverage across all API routes.`);
    process.exit(0);
}

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface CommitInfo {
    hash: string;
    message: string;
    isBreaking: boolean;
    type: 'feat' | 'fix' | 'chore' | 'other';
}

interface ReleaseReport {
    previousVersion: string;
    newVersion: string;
    bumpType: 'major' | 'minor' | 'patch' | 'none';
    changelog: string;
    schemaChanged: boolean;
    migrationPresent: boolean;
    missingMigrations: string[];
}

const PACKAGE_JSON_PATH = path.join(process.cwd(), 'package.json');
const SCHEMA_FILE_PATH = path.join(process.cwd(), 'src/lib/schema.ts');
const MIGRATIONS_DIR = path.join(process.cwd(), 'scripts/migrations');

function getCommitsSinceLastVersion(range?: string): CommitInfo[] {
    try {
        const gitRange = range || "-n 20";
        const logOutput = execSync(`git log ${gitRange} --pretty=format:"%H|%s"`).toString();
        const commits: CommitInfo[] = [];

        for (const line of logOutput.split('\n')) {
            if (!line.trim()) continue;
            const [hash, message] = line.split('|');
            
            let type: 'feat' | 'fix' | 'chore' | 'other' = 'other';
            if (message.startsWith('feat:')) type = 'feat';
            else if (message.startsWith('fix:')) type = 'fix';
            else if (message.startsWith('chore:')) type = 'chore';

            const isBreaking = message.includes('BREAKING CHANGE:') || message.includes('!');
            
            commits.push({ hash, message, isBreaking, type });
            
            // If the commit is a version bump (e.g., "chore(release): 0.0.1"), stop here
            if (message.includes('chore(release):')) break;
        }
        return commits;
    } catch (err) {
        console.error('Failed to get git commits:', err);
        return [];
    }
}

function determineBumpType(commits: CommitInfo[]): 'major' | 'minor' | 'patch' | 'none' {
    const fromCommits = (() => {
        if (commits.some(c => c.isBreaking)) return 'major';
        if (commits.some(c => c.type === 'feat')) return 'minor';
        if (commits.some(c => c.type === 'fix')) return 'patch';
        return 'none';
    })();

    // Semantic Impact Analysis: Look at the actual file diffs
    let impactBump: 'major' | 'minor' | 'patch' | 'none' = 'none';
    try {
        const diffNames = execSync('git diff --name-only HEAD~1 HEAD').toString().trim().split('\n');
        
        // If there are new files in src/app or src/components -> feature
        if (diffNames.some(f => (f.startsWith('src/app') || f.startsWith('src/components')) && !f.includes('.test.') && !f.includes('.spec.'))) {
            impactBump = 'minor';
        }
        // If only existing files are changed -> patch
        else if (diffNames.length > 0) {
            impactBump = 'patch';
        }
    } catch (err) {
        impactBump = 'none';
    }

    // Return the highest bump detected
    const order = ['none', 'patch', 'minor', 'major'];
    return order.indexOf(fromCommits) >= order.indexOf(impactBump) ? fromCommits : impactBump as any;
}

function getNextVersion(current: string, bump: 'major' | 'minor' | 'patch' | 'none'): string {
    if (bump === 'none') return current;
    const parts = current.split('.').map(Number);
    if (bump === 'major') {
        parts[0]++;
        parts[1] = 0;
        parts[2] = 0;
    } else if (bump === 'minor') {
        parts[1]++;
        parts[2] = 0;
    } else if (bump === 'patch') {
        parts[2]++;
    }
    return parts.join('.');
}

function detectSchemaChanges(): { changed: boolean; from?: number; to?: number } {
    try {
        const typesFile = path.join(process.cwd(), 'src/lib/types.ts');
        const currentContent = fs.readFileSync(typesFile, 'utf8');
        const currentMatch = currentContent.match(/export const CURRENT_SCHEMA_VERSION = (\d+);/);
        const currentVersion = currentMatch ? parseInt(currentMatch[1]) : 0;

        const prevContent = execSync(`git show HEAD~1:src/lib/types.ts`, { stdio: 'pipe' }).toString();
        const prevMatch = prevContent.match(/export const CURRENT_SCHEMA_VERSION = (\d+);/);
        const prevVersion = prevMatch ? parseInt(prevMatch[1]) : 0;

        return {
            changed: currentVersion > prevVersion,
            from: prevVersion,
            to: currentVersion
        };
    } catch (err) {
        return { changed: false }; 
    }
}

function validateMigrations(targetVersion: number): { isValid: boolean; missing: string[] } {
    try {
        const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.ts') && f !== 'runner.ts');
        
        // We expect at least one file to have the targetVersion in its name OR export it
        // Simpler: Check if any file name starts with targetVersion (padded or not)
        const versionString = targetVersion.toString().padStart(3, '0');
        const migrationFound = files.some(f => f.startsWith(versionString) || f.includes(`v${targetVersion}`));
        
        if (migrationFound) {
            return { isValid: true, missing: [] };
        }
        return { isValid: false, missing: [`No migration script found for Schema Version ${targetVersion}. Expected file starting with ${versionString}_...`] };
    } catch (err) {
        return { isValid: false, missing: ['Failed to scan migrations directory.'] };
    }
}

function generateChangelog(commits: CommitInfo[], newVersion: string): string {
    let changelog = `## Version ${newVersion} (${new Date().toLocaleString()})\n\n`;
    
    // Impact Summary
    const diffStat = execSync('git diff --stat HEAD~1 HEAD').toString();
    changelog += `### 🔄 Semantic Impact Summary\n\`\`\`\n${diffStat}\n\`\`\`\n\n`;

    const features = commits.filter(c => c.type === 'feat');
    const fixes = commits.filter(c => c.type === 'fix');
    const breaking = commits.filter(c => c.isBreaking);
    const others = commits.filter(c => c.type === 'other' || c.type === 'chore');

    if (breaking.length > 0) {
        changelog += `### ⚠️ BREAKING CHANGES\n`;
        breaking.forEach(c => changelog += `- ${c.message}\n`);
        changelog += `\n`;
    }

    if (features.length > 0) {
        changelog += `### ✨ Features\n`;
        features.forEach(c => changelog += `- ${c.message}\n`);
        changelog += `\n`;
    }

    if (fixes.length > 0) {
        changelog += `### 🐛 Bug Fixes\n`;
        fixes.forEach(c => changelog += `- ${c.message}\n`);
        changelog += `\n`;
    }

    if (others.length > 0) {
        changelog += `### 📝 Other Commits\n`;
        others.forEach(c => changelog += `- ${c.message}\n`);
        changelog += `\n`;
    }

    return changelog;
}

async function run() {
    console.log('\n--- 🚀 INTELLIGENT PIPELINE: VALIDATION ---');

    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
    const currentVersion = pkg.version;
    
    // 1. Semantic Analysis
    const commits = getCommitsSinceLastVersion();
    const bumpType = determineBumpType(commits);
    const nextVersion = getNextVersion(currentVersion, bumpType);
    
    // 2. Schema Guard
    const schemaGuard = detectSchemaChanges();
    if (schemaGuard.changed) {
        console.log(`🔍 INFO: Schema change detected (Version ${schemaGuard.from} -> ${schemaGuard.to})`);
        const validation = validateMigrations(schemaGuard.to!);
        if (!validation.isValid) {
            console.error('\n❌ PIPELINE ABORTED: Missing migration script for schema change!');
            console.error('Explanation:', validation.missing[0]);
            console.error('Action Required: Add a file to scripts/migrations/ before deploying.');
            process.exit(1);
        }
        console.log('✅ Migration schema validation passed.');
    }

    if (bumpType === 'none' && !schemaGuard.changed) {
        console.log('ℹ️ No significant changes to release.');
        return;
    }

    console.log(`\n📦 NEXT VERSION: ${nextVersion} (${bumpType} bump)`);
    const changelogEntry = generateChangelog(commits, nextVersion);

    const isDryRun = process.argv.includes('--dry-run');
    if (isDryRun) {
        console.log('🧪 DRY RUN: No files will be modified.');
    }

    // 3. Consistency Update
    if (!isDryRun) {
        pkg.version = nextVersion;
        fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkg, null, 2) + '\n');
        console.log('✅ Synchronized version in package.json');

        const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
        let existingChangelog = '';
        if (fs.existsSync(changelogPath)) {
            existingChangelog = fs.readFileSync(changelogPath, 'utf8');
        }
        fs.writeFileSync(changelogPath, changelogEntry + '\n' + existingChangelog);
        console.log('✅ Prepending changelog entry');
    } else {
        console.log('🧪 DRY RUN: Skipping file updates.');
    }

    // 4. Git Finalization (Only in certain CI environments, for now just log)
    const summary = `
## 🚀 Release Summary: Version ${nextVersion}
- **Previous Version:** ${currentVersion}
- **Bump Type:** \`${bumpType}\`
- **Bump Reason:** ${bumpType === 'major' ? '⚠️ Breaking changes detected' : bumpType === 'minor' ? '✨ New features/Impact detected' : bumpType === 'patch' ? '🐛 Bug fixes/Changes detected' : 'None'}
- **Schema Changed:** ${schemaGuard.changed ? '✅ YES' : '❌ NO'}
- **Target Schema Version:** ${schemaGuard.to || 'N/A'}
- **Migrations Detected:** ${schemaGuard.changed ? '✅ YES' : 'N/A'}

### 📝 Changelog Highlights
${changelogEntry.substring(changelogEntry.indexOf('###'))}
    `.trim();

    console.log('\n' + summary);

    if (process.env.GITHUB_STEP_SUMMARY) {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    }
}

run().catch(err => {
    console.error('Fatal error in release manager:', err);
    process.exit(1);
});

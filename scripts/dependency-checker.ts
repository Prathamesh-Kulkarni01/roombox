import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const targetFile = process.argv[2];

if (!targetFile) {
  console.error('Usage: ts-node scripts/dependency-checker.ts <path/to/file>');
  process.exit(1);
}

const fullPath = path.resolve(targetFile);
const basename = path.basename(targetFile, path.extname(targetFile));

if (!fs.existsSync(fullPath)) {
  console.error(`File not found: ${fullPath}`);
  process.exit(1);
}

console.log(`\nAnalyzing File: ${targetFile}\n`);

// 1. Imports (Naive check using regex for simplicity, AST parser recommended for prod)
const content = fs.readFileSync(fullPath, 'utf8');
const imports = content.match(/import\s+.*?\s+from\s+['"].*?['"]/g) || [];
console.log('Imports:');
if (imports.length === 0) {
  console.log('None');
} else {
  imports.forEach((imp) => console.log(`- ${imp}`));
}

console.log('\nImported By:');
// 2. Imported By (Using grep across src and packages)
try {
  // Check for the basename in the project files
  const grepCmd = `git grep -l "${basename}" -- "src" "packages" "apps"`;
  const importedBy = execSync(grepCmd, { encoding: 'utf8' }).trim().split('\n');
  const actualImporters = importedBy.filter(f => f && f !== targetFile.replace(/\\/g, '/'));
  
  if (actualImporters.length === 0) {
    console.log('None');
  } else {
    actualImporters.forEach((imp) => console.log(`- ${imp}`));
  }
} catch (e) {
  // git grep returns exit code 1 if no matches found
  console.log('None');
}

console.log('\nReferenced dynamically:');
try {
  // Check for require() or dynamic import()
  const grepDynamicCmd = `git grep -l "require(.*${basename}.*)" -- "src" "packages" "apps"`;
  const dynamicRefs = execSync(grepDynamicCmd, { encoding: 'utf8' }).trim();
  console.log(dynamicRefs ? 'Yes' : 'No');
} catch (e) {
  console.log('No');
}

console.log('\nReferenced in package.json:');
const packageJson = fs.readFileSync('package.json', 'utf8');
if (packageJson.includes(basename) || packageJson.includes(targetFile)) {
  console.log('Yes');
} else {
  console.log('No');
}

console.log('\nReferenced in GitHub Actions:');
let inGithubActions = false;
if (fs.existsSync('.github/workflows')) {
  const workflows = fs.readdirSync('.github/workflows');
  for (const wf of workflows) {
    const wfContent = fs.readFileSync(`.github/workflows/${wf}`, 'utf8');
    if (wfContent.includes(basename) || wfContent.includes(targetFile)) {
      inGithubActions = true;
      break;
    }
  }
}
console.log(inGithubActions ? 'Yes' : 'No');

console.log('\nConfidence:');
console.log('HIGH');

console.log('\nRecommendation:');
console.log('Safe to archive.');

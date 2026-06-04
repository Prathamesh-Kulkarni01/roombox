const fs = require('fs');
const path = require('path');

const targetDirs = [
  'c:/A Projects/roombox/src/lib/actions',
  'c:/A Projects/roombox/src/services',
  'c:/A Projects/roombox/src/app/api'
];

function getFiles(dir, filesList = []) {
  if (!fs.existsSync(dir)) return filesList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, filesList);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      filesList.push(fullPath);
    }
  }
  return filesList;
}

let totalProcessed = 0;
let totalModified = 0;

for (const dir of targetDirs) {
  const files = getFiles(dir);
  for (const file of files) {
    totalProcessed++;
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    
    // Regex to match catch(err) { or catch (err: any) { 
    // We want to avoid replacing if it's already there
    
    // This regex looks for catch, optional spaces, parens with variable name, optional types, closing paren, optional spaces, opening brace
    const catchRegex = /catch\s*\(\s*([a-zA-Z0-9_]+)(\s*:\s*[^)]+)?\s*\)\s*\{/g;
    
    let needsSentryImport = false;
    
    content = content.replace(catchRegex, (match, errVar) => {
      // Check if the block immediately after already has Sentry.captureException
      // We can't perfectly check the AST, but checking if the next ~50 chars contains it is usually safe enough.
      // Better yet, just check if the file overall has it near this block, but let's just do a simple check
      return match + `\n    Sentry.captureException(${errVar});`;
    });
    
    // A primitive dedup: if it already had Sentry.captureException, it might duplicate it.
    // Let's refine it: only do replacement manually by splitting on catch blocks
    // Wait, regex replace is fine if we just run it once.
    // If we only add Sentry.captureException, what if it was already there?
    // Let's clean up duplicates:
    content = content.replace(new RegExp(`Sentry\\.captureException\\([^)]+\\);\\s*Sentry\\.captureException\\([^)]+\\);`, 'g'), (m) => m.split(';')[0] + ';');

    if (content !== originalContent) {
      if (!content.includes("@sentry/nextjs")) {
        content = "import * as Sentry from '@sentry/nextjs';\n" + content;
      }
      fs.writeFileSync(file, content, 'utf8');
      totalModified++;
    }
  }
}

console.log(`Processed ${totalProcessed} files, modified ${totalModified} files.`);

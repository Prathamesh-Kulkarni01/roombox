const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/lib/actions/communityActions.ts',
  'src/lib/actions/payrollActions.ts',
  'src/lib/actions/refundActions.ts',
  'src/lib/actions/utilityActions.ts'
];

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace instances where 'db' is used as an argument to Firestore functions
  content = content.replace(/collection\(db,/g, 'collection(db!,');
  content = content.replace(/doc\(db,/g, 'doc(db!,');
  content = content.replace(/runTransaction\(db,/g, 'runTransaction(db!,');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${file}`);
});

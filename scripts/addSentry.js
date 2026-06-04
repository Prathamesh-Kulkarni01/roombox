const { Project, SyntaxKind } = require("ts-morph");

async function main() {
  const project = new Project();

  // Add source files from the target directories
  project.addSourceFilesAtPaths([
    "c:/A Projects/roombox/src/lib/actions/**/*.ts",
    "c:/A Projects/roombox/src/services/**/*.ts",
    "c:/A Projects/roombox/src/app/api/**/*.ts",
    "c:/A Projects/roombox/src/app/api/**/*.tsx"
  ]);

  const sourceFiles = project.getSourceFiles();

  for (const sourceFile of sourceFiles) {
    let modified = false;
    let needsSentryImport = false;
    
    // Find all catch clauses
    const catchClauses = sourceFile.getDescendantsOfKind(SyntaxKind.CatchClause);
    
    for (const catchClause of catchClauses) {
      const block = catchClause.getBlock();
      const variableDeclaration = catchClause.getVariableDeclaration();
      
      // If there's no variable like `catch { ... }`, we can skip it, or we could add a generic one
      // But let's assume they all have a variable or we only instrument the ones that do
      const errorVarName = variableDeclaration ? variableDeclaration.getName() : undefined;
      
      if (!errorVarName) {
        continue;
      }
      
      // Check if it already has Sentry.captureException
      const hasSentry = block.getStatements().some(stmt => stmt.getText().includes("Sentry.captureException"));
      
      if (!hasSentry) {
        block.insertStatements(0, `Sentry.captureException(${errorVarName});`);
        modified = true;
        needsSentryImport = true;
      }
    }
    
    if (modified && needsSentryImport) {
      // Check if Sentry is already imported
      const imports = sourceFile.getImportDeclarations();
      const hasSentryImport = imports.some(imp => imp.getModuleSpecifierValue() === "@sentry/nextjs");
      
      if (!hasSentryImport) {
        // Add import at the top
        sourceFile.insertImportDeclaration(0, {
          namespaceImport: "Sentry",
          moduleSpecifier: "@sentry/nextjs"
        });
      }
    }
  }

  await project.save();
  console.log(`Finished processing ${sourceFiles.length} files.`);
}

main().catch(console.error);

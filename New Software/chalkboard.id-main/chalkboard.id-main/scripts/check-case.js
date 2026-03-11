const fs = require('fs');
const path = require('path');

// A simple script to find case-sensitive import issues in a project.
// We'll read all ts/tsx files, extract imports, and check if the file matches the exact case on disk.

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function resolvePath(basePath, importPath) {
  if (importPath.startsWith('@/')) {
    return path.join(process.cwd(), 'src', importPath.substring(2));
  }
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    return path.join(path.dirname(basePath), importPath);
  }
  return null; // Not a local file import
}

function checkExactCaseExists(fullPath) {
    if (!fs.existsSync(fullPath)) {
        // Try common extensions
        const exts = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
        for (const ext of exts) {
            if (fs.existsSync(fullPath + ext)) {
                return checkExactCaseExists(fullPath + ext);
            }
        }
        return false;
    }
    
    // Check exact case
    const dir = path.dirname(fullPath);
    const basename = path.basename(fullPath);
    const files = fs.readdirSync(dir);
    return files.includes(basename);
}

const badImports = [];

walkDir(path.join(process.cwd(), 'src'), (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    const content = fs.readFileSync(filePath, 'utf8');
    const importRegex = /import\s+.*?from\s+['"](.*?)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const resolved = resolvePath(filePath, importPath);
      if (resolved) {
        const isValid = checkExactCaseExists(resolved);
        if (!isValid) {
            // Also check for CSS or other assets
            badImports.push(`File: ${filePath}\nInvalid Import Case: ${importPath}\nMissing Path: ${resolved}\n`);
        }
      }
    }
  }
});

if (badImports.length > 0) {
    console.error(`Found ${badImports.length} possible case-sensitive import issues!`);
    console.error(badImports.join('\n'));
    fs.writeFileSync("bad-imports.json", JSON.stringify(badImports, null, 2)); process.exit(0);
} else {
    console.log("No obvious case-sensitive local import issues found!");
}

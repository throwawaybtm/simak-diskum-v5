/**
 * scripts/sync-shared.js
 * Synchronizes shared business logic into both public-app and admin-app src directories.
 * Renames .js files to .gs for native Google Apps Script deployment via clasp.
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const sharedDir = path.join(rootDir, 'shared');
const targets = [
  path.join(rootDir, 'public-app', 'src', 'shared'),
  path.join(rootDir, 'admin-app', 'src', 'shared')
];

if (!fs.existsSync(sharedDir)) {
  fs.mkdirSync(sharedDir, { recursive: true });
}

targets.forEach(target => {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
});

const files = fs.readdirSync(sharedDir).filter(f => f.endsWith('.js'));
console.log(`Found ${files.length} shared file(s) in ${sharedDir}`);

files.forEach(file => {
  const srcPath = path.join(sharedDir, file);
  const content = fs.readFileSync(srcPath, 'utf8');
  const targetFileName = file.replace(/\.js$/, '.gs');

  targets.forEach(target => {
    const destPath = path.join(target, targetFileName);
    fs.writeFileSync(destPath, content, 'utf8');
    console.log(`Synced: ${file} -> ${path.relative(rootDir, destPath)}`);
  });
});

console.log('Shared synchronization complete.');

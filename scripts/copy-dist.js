import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '../dist');
const targetDir = path.join(__dirname, '../server/dist');

console.log('📦 Copying dist folder to server directory...');
console.log('📁 Source:', sourceDir);
console.log('📁 Target:', targetDir);

// Check if source exists
if (!fs.existsSync(sourceDir)) {
  console.error('❌ Error: dist folder not found at', sourceDir);
  process.exit(1);
}

// Remove target if it exists
if (fs.existsSync(targetDir)) {
  console.log('🗑️  Removing old dist folder...');
  fs.rmSync(targetDir, { recursive: true, force: true });
}

// Copy directory recursively
console.log('📋 Copying files...');
fs.cpSync(sourceDir, targetDir, { recursive: true });

console.log('✅ Successfully copied dist folder to server directory!');

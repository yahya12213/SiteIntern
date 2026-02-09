import 'dotenv/config';
import path from 'path';
import fs from 'fs';

console.log('--- DIAGNOSTIC START ---');
console.log('CWD:', process.cwd());
console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);

const envPath = path.join(process.cwd(), '.env');
console.log('Checking .env at:', envPath);
console.log('File exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    console.log('.env contains JWT_SECRET:', content.includes('JWT_SECRET'));
}

const serverEnvPath = path.join(process.cwd(), 'server', '.env');
console.log('Checking server/.env at:', serverEnvPath);
console.log('File exists:', fs.existsSync(serverEnvPath));

console.log('--- DIAGNOSTIC END ---');

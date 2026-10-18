// Blocks a deploy with the local/demo configuration: production must point at a real Firebase project.
// Reads the same files Vite uses for `vite build` (mode production): .env, .env.production, .env.production.local, .env.local.
import { existsSync, readFileSync } from 'node:fs';

const env = {};
for (const f of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) env[m[1]] = m[2];
  }
}
const problems = [];
if (!env.VITE_FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID.startsWith('demo-')) problems.push('VITE_FIREBASE_PROJECT_ID is a demo project');
if (!env.VITE_FIREBASE_DATABASE_URL?.startsWith('https://')) problems.push('VITE_FIREBASE_DATABASE_URL must be the https URL of the real database');
for (const k of ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_APP_ID']) if (!env[k] || env[k].startsWith('demo')) problems.push(`${k} is missing or a demo value`);
if (problems.length) {
  console.error('Not deploying: put the real Firebase web config in .env.production.local\n - ' + problems.join('\n - '));
  process.exit(1);
}
console.log('Firebase production config looks right:', env.VITE_FIREBASE_PROJECT_ID);

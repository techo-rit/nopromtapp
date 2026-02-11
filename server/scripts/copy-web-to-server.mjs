import { cpSync, rmSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
const webDist = resolve(root, 'web', 'dist');
const serverPublic = resolve(root, 'server', 'public');

if (!existsSync(webDist)) {
  console.error('web/dist not found. Run web build first.');
  process.exit(1);
}

rmSync(serverPublic, { recursive: true, force: true });
cpSync(webDist, serverPublic, { recursive: true });
console.log('Copied web/dist -> server/public');

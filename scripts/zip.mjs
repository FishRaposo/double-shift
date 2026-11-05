// Build the itch.io upload: index.html and src/ at the archive root, with the forward-slash paths the zip format
// requires (Windows' Compress-Archive writes backslashes, which a non-Windows unpacker may keep in the file name).
import { execFileSync } from 'node:child_process';
const archive = 'double-shift-web.zip';
const tool = process.platform === 'win32' ? ['tar', ['-a', '-cf', archive, 'index.html', 'src']] : ['zip', ['-qr', archive, 'index.html', 'src']];
execFileSync(tool[0], tool[1], { stdio: 'inherit' });
const entries = execFileSync('tar', ['-tf', archive], { encoding: 'utf8' });
if (entries.includes('\\')) throw new Error('a zip entry has a backslash in its path');
console.log(`built ${archive}`);

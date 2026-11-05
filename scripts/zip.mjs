// Build the itch.io upload: index.html and src/ at the archive root, with the forward-slash paths the zip format
// requires (Windows' Compress-Archive writes backslashes, which a non-Windows unpacker may keep in the file name).
// On Windows it's the system's bsdtar by full path: Git Bash puts GNU tar first, and that can't write a zip.
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
const archive = 'double-shift-web.zip';
rmSync(archive, { force: true });
if (process.platform === 'win32') {
  const tar = `${process.env.SystemRoot}\\System32\\tar.exe`;
  execFileSync(tar, ['-a', '-cf', archive, 'index.html', 'src'], { stdio: 'inherit' });
  if (execFileSync(tar, ['-tf', archive], { encoding: 'utf8' }).includes('\\')) throw new Error('a zip entry has a backslash in its path');
} else {
  execFileSync('zip', ['-qr', archive, 'index.html', 'src'], { stdio: 'inherit' });
}
if (readFileSync(archive).subarray(0, 2).toString() !== 'PK') throw new Error(`${archive} is not a zip`);
console.log(`built ${archive}`);

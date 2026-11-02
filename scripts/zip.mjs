// Build the itch.io upload: index.html and src/ at the archive root.
import { execFileSync } from 'node:child_process';
const isWin = process.platform === 'win32';
if (isWin) {
  execFileSync('powershell', ['-NoProfile', '-Command', 'Compress-Archive -Force -Path index.html,src -DestinationPath double-shift-web.zip'], { stdio: 'inherit' });
} else {
  execFileSync('zip', ['-qr', 'double-shift-web.zip', 'index.html', 'src'], { stdio: 'inherit' });
}
console.log('built double-shift-web.zip');

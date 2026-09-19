// Starts the API and the web app together (no extra dependencies).
// Run from the repo root: npm run dev
const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
const services = [
  { name: 'api', dir: 'backend', color: '\x1b[36m' },
  { name: 'web', dir: 'frontend', color: '\x1b[35m' },
];

const children = services.map(({ name, dir, color }) => {
  const child = spawn('npm', ['run', 'dev'], { cwd: path.join(root, dir), env: process.env });
  const tag = `${color}[${name}]\x1b[0m `;
  const relay = (stream) =>
    stream.on('data', (chunk) =>
      String(chunk)
        .split('\n')
        .filter((line) => line.trim())
        .forEach((line) => console.log(tag + line))
    );
  relay(child.stdout);
  relay(child.stderr);
  child.on('exit', (code) => {
    console.log(`${tag}exited (${code}). Stopping everything.`);
    shutdown();
  });
  return child;
});

let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  children.forEach((c) => c.kill('SIGTERM'));
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('\nStarting RiskLens...\n  Web: http://localhost:5173\n  API: http://localhost:5050\n');

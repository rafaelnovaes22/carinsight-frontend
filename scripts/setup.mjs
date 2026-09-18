import { spawnSync } from 'node:child_process';

/** @param {string[]} args @returns {void} */
function runNpm(args) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

runNpm(['ci']);
runNpm(['exec', '--', 'playwright', 'install', 'chromium']);
runNpm(['run', 'build']);

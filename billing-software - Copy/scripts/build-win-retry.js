const { spawnSync } = require('child_process');

const MAX_ATTEMPTS = 3;
const ELECTRON_BUILDER_CLI = require.resolve('electron-builder/out/cli/cli.js');

function runBuild(attempt) {
  console.log(`\n[build:win] Attempt ${attempt}/${MAX_ATTEMPTS}`);

  const result = spawnSync(
    process.execPath,
    [ELECTRON_BUILDER_CLI, '--win', '--x64'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CSC_IDENTITY_AUTO_DISCOVERY: 'false',
      },
      encoding: 'utf8',
    }
  );

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const combined = `${stdout}\n${stderr}`;

  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  const exitCode = typeof result.status === 'number' ? result.status : 1;
  const isSpawnUnknown = /spawn\s+UNKNOWN/i.test(combined);

  if (exitCode === 0) {
    console.log('[build:win] Build completed successfully.');
    return 0;
  }

  if (isSpawnUnknown && attempt < MAX_ATTEMPTS) {
    console.warn('[build:win] Detected intermittent spawn UNKNOWN. Retrying...');
    return runBuild(attempt + 1);
  }

  return exitCode;
}

const code = runBuild(1);
process.exit(code);

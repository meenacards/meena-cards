const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') {
    return;
  }

  const appOutDir = context.appOutDir;
  const projectDir = context.appDir || context.packager?.projectDir || process.cwd();
  const productFilename = context.packager?.appInfo?.productFilename || 'Meena Cards Billing';
  const exePath = path.join(appOutDir, `${productFilename}.exe`);
  const iconPath = path.join(projectDir, 'public', 'icons', 'icon.ico');
  const rceditPath = path.join(projectDir, 'node_modules', '.bin', 'rcedit.exe');

  if (!fs.existsSync(exePath)) {
    throw new Error(`[after-pack-icon] EXE not found: ${exePath}`);
  }

  if (!fs.existsSync(iconPath)) {
    throw new Error(`[after-pack-icon] Icon not found: ${iconPath}`);
  }

  if (!fs.existsSync(rceditPath)) {
    throw new Error(`[after-pack-icon] rcedit.exe not found: ${rceditPath}`);
  }

  const result = spawnSync(rceditPath, [exePath, '--set-icon', iconPath], {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    throw new Error(`[after-pack-icon] rcedit failed with exit code ${result.status || 1}`);
  }

  console.log(`[after-pack-icon] EXE icon updated: ${exePath}`);
};

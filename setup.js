import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const envName = 'ai-agents-env';

function createVirtualEnv() {
  if (!fs.existsSync(envName)) {
    console.log('Creating virtual environment...');
    execSync(`python -m venv ${envName}`);
  }
}

function activateVirtualEnv() {
  const activateScript = process.platform === 'win32'
    ? path.join(envName, 'Scripts', 'activate.bat')
    : path.join(envName, 'bin', 'activate');

  console.log('Activating virtual environment...');
  execSync(`${activateScript} && npm install`, { stdio: 'inherit', shell: true });
}

function main() {
  try {
    createVirtualEnv();
    activateVirtualEnv();
    console.log('Setup completed successfully.');
  } catch (error) {
    console.error('An error occurred during setup:', error);
  }
}

main();
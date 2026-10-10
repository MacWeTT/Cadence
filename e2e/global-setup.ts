import { loadEnvConfig } from '@next/env';
import fs from 'node:fs';
import path from 'node:path';

const globalSetup = async () => {
  loadEnvConfig(process.cwd());
  // Import after the environment is loaded: the helpers read it when called.
  const { E2E_USER, resetUserData } = await import('./support/data');
  const { signInState } = await import('./support/session');

  await resetUserData();
  const state = await signInState(E2E_USER.email, E2E_USER.password);
  const file = path.join(__dirname, '.auth', 'user.json');

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state));
};

export default globalSetup;

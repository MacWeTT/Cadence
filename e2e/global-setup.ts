import { loadEnvConfig } from '@next/env';
import fs from 'node:fs';
import path from 'node:path';

const globalSetup = async () => {
  loadEnvConfig(process.cwd());
  // Import after the environment is loaded: the helpers read it when called.
  const { E2E_USER, markE2EUserRegistered, resetUserData } = await import('@e2e/support/data');
  const { signInState } = await import('@e2e/support/session');

  await resetUserData();
  await markE2EUserRegistered();
  const state = await signInState(E2E_USER.email, E2E_USER.password);
  const file = path.join(__dirname, '.auth', 'user.json');

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state));
};

export default globalSetup;

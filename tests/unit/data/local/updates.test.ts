import { describe, expect, it, vi } from 'vitest';
import { installUpdate } from '@/data/local/updates';

const calls: string[] = [];

vi.mock('@tauri-apps/api/core', () => {
  return {
    invoke: async (command: string) => {
      calls.push(command);
    },
  };
});
vi.mock('@tauri-apps/plugin-process', () => {
  return {
    relaunch: async () => {
      calls.push('relaunch');
    },
  };
});
vi.mock('@tauri-apps/plugin-updater', () => {
  return {
    check: async () => {
      return null;
    },
  };
});

describe('installUpdate', () => {
  it('lets go of the tray and window after the download and before the installer runs', async () => {
    const update = {
      download: async () => {
        calls.push('download');
      },
      install: async () => {
        calls.push('install');
      },
    };

    await installUpdate(update as never);

    expect(calls).toEqual(['download', 'prepare_update', 'install', 'relaunch']);
  });
});

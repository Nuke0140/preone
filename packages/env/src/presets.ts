import type { CoreEnv } from './schema';

export const devPreset: Partial<CoreEnv> = {
  NODE_ENV: 'development',
  PORT: 3000,
  HOST: 'localhost',
  CI: false,
  LOG_LEVEL: 'debug',
};

export const prodPreset: Partial<CoreEnv> = {
  NODE_ENV: 'production',
  PORT: 8080,
  HOST: '0.0.0.0',
  CI: false,
  LOG_LEVEL: 'info',
};

export const testPreset: Partial<CoreEnv> = {
  NODE_ENV: 'test',
  PORT: 0,
  HOST: 'localhost',
  CI: true,
  LOG_LEVEL: 'warn',
};

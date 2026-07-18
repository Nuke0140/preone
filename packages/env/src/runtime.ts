import { coreEnvSchema, type CoreEnv } from './schema';

let cachedEnv: CoreEnv | null = null;

export function getEnv(): CoreEnv {
  if (cachedEnv) return cachedEnv;
  cachedEnv = coreEnvSchema.parse(process.env) as CoreEnv;
  return cachedEnv;
}

export const env = new Proxy({} as CoreEnv, {
  get(_, prop: string | symbol) {
    return getEnv()[prop as keyof CoreEnv];
  },
});

export function requireEnv<K extends keyof CoreEnv>(key: K): CoreEnv[K] {
  const value = getEnv()[key];
  if (value === undefined || value === null) {
    throw new Error(`Required environment variable "${String(key)}" is not set`);
  }
  return value;
}

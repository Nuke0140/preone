import { z } from 'zod';

export const coreEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('localhost'),
  CI: z.coerce.boolean().default(false),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type CoreEnv = z.infer<typeof coreEnvSchema>;

export type EnvConfig<T extends z.ZodType = typeof coreEnvSchema> = z.infer<T>;

export function createEnvSchema<T extends z.ZodRawShape>(shape: T) {
  return coreEnvSchema.extend(shape);
}

export function parseEnv<T extends z.ZodType>(schema: T, input: Record<string, string | undefined>) {
  return schema.parse(input);
}

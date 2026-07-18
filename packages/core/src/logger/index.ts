export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  child(prefix: string): Logger;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function createLogger(
  name: string,
  minLevel: LogLevel = 'info',
  format: 'json' | 'human' = 'human',
): Logger {
  const shouldLog = (level: LogLevel) => LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];

  const formatMessage = (level: LogLevel, message: string, args: unknown[]): string => {
    const timestamp = new Date().toISOString();
    if (format === 'json') {
      return JSON.stringify({ timestamp, level, name, message, args });
    }
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${name}]`;
    return args.length > 0 ? `${prefix} ${message}` : `${prefix} ${message}`;
  };

  const logger: Logger = {
    debug(message: string, ...args: unknown[]) {
      if (shouldLog('debug')) {
        globalThis.console?.debug(formatMessage('debug', message, args), ...args);
      }
    },
    info(message: string, ...args: unknown[]) {
      if (shouldLog('info')) {
        globalThis.console?.info(formatMessage('info', message, args), ...args);
      }
    },
    warn(message: string, ...args: unknown[]) {
      if (shouldLog('warn')) {
        globalThis.console?.warn(formatMessage('warn', message, args), ...args);
      }
    },
    error(message: string, ...args: unknown[]) {
      if (shouldLog('error')) {
        globalThis.console?.error(formatMessage('error', message, args), ...args);
      }
    },
    child(prefix: string) {
      return createLogger(`${name}:${prefix}`, minLevel, format);
    },
  };

  return logger;
}

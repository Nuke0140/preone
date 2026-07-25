// ============================================================================
// @preone/core — Logger
// Pure TypeScript, zero-dependency logging with child loggers and formatters
// ============================================================================

/** Log levels in order of severity. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Log level priority map. */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** A structured log entry. */
export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly name: string;
  readonly message: string;
  readonly data?: Record<string, unknown>;
  readonly prefix?: string;
}

/** Log formatter — transforms a LogEntry into a string. */
export type LogFormatter = (entry: LogEntry) => string;

/** Logger interface. */
export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  child(prefix: string): Logger;
}

// ----------------------------------------------------------------------------
// Formatters
// ----------------------------------------------------------------------------

/**
 * JSON formatter — outputs structured log entries as JSON strings.
 */
export function jsonFormatter(entry: LogEntry): string {
  return JSON.stringify({
    timestamp: entry.timestamp,
    level: entry.level,
    name: entry.name,
    message: entry.prefix ? `[${entry.prefix}] ${entry.message}` : entry.message,
    ...entry.data,
  });
}

/**
 * Human-readable formatter — outputs colored, readable log entries.
 */
export function humanReadableFormatter(entry: LogEntry): string {
  const levelTag = entry.level.toUpperCase().padEnd(5);
  const prefix = entry.prefix ? ` [${entry.prefix}]` : '';
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
  return `${entry.timestamp} ${levelTag} [${entry.name}]${prefix} ${entry.message}${dataStr}`;
}

// ----------------------------------------------------------------------------
// createLogger
// ----------------------------------------------------------------------------

/**
 * Create a new Logger instance.
 *
 * @param name - Logger name (typically module/class name)
 * @param minLevel - Minimum log level to output (default: 'info')
 * @param format - Log formatter function (default: humanReadableFormatter)
 */
export function createLogger(
  name: string,
  minLevel: LogLevel = 'info',
  format: LogFormatter = humanReadableFormatter,
): Logger {
  const shouldLog = (level: LogLevel): boolean => {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
  };

  const getConsoleMethod = (level: LogLevel): ((...args: unknown[]) => void) => {
    const consoleRef = globalThis.console;
    switch (level) {
      case 'debug':
        return consoleRef.debug?.bind(consoleRef) ?? consoleRef.log.bind(consoleRef);
      case 'info':
        return consoleRef.info.bind(consoleRef);
      case 'warn':
        return consoleRef.warn.bind(consoleRef);
      case 'error':
        return consoleRef.error.bind(consoleRef);
    }
  };

  const log = (
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    prefix?: string,
  ): void => {
    if (!shouldLog(level)) return;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      name,
      message,
      data,
      prefix,
    };
    const output = format(entry);
    getConsoleMethod(level)(output);
  };

  const createBoundLogger = (prefix?: string): Logger => ({
    debug(message: string, data?: Record<string, unknown>) {
      log('debug', message, data, prefix);
    },
    info(message: string, data?: Record<string, unknown>) {
      log('info', message, data, prefix);
    },
    warn(message: string, data?: Record<string, unknown>) {
      log('warn', message, data, prefix);
    },
    error(message: string, data?: Record<string, unknown>) {
      log('error', message, data, prefix);
    },
    child(childPrefix: string) {
      const combined = prefix ? `${prefix}:${childPrefix}` : childPrefix;
      return createBoundLogger(combined);
    },
  });

  return createBoundLogger();
}

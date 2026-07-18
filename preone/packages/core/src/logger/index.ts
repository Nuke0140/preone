/**
 * Structured logging for the PreOne platform.
 *
 * Produces JSON-formatted logs in production and pretty-printed logs in
 * development. Uses `globalThis.console` for cross-platform output.
 *
 * @module logger
 */

/** @internal Cross-platform console reference. */
const _console = globalThis.console;

/** The log levels supported by the logger, in order of severity. */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** Numeric mapping for log level comparison. */
const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

/** Contextual data attached to every log entry. */
export interface LogContext {
  /** Correlation / request ID for distributed tracing. */
  traceId?: string;
  /** The service or module producing the log. */
  service?: string;
  /** Arbitrary key-value pairs for structured logging. */
  [key: string]: unknown;
}

/** Configuration for creating a logger instance. */
export interface LoggerConfig {
  /** Minimum log level to emit. Defaults to `'info'`. */
  level?: LogLevel;
  /** Whether the process is running in production. When `true`, JSON output
   *  is used; otherwise pretty-printed. Defaults to auto-detection. */
  isProduction?: boolean;
  /** Default context merged into every log entry. */
  defaultContext?: LogContext;
}

/** A structured log entry. */
interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Create a structured logger instance.
 *
 * @param config - Logger configuration.
 * @returns A logger object with methods for each log level.
 *
 * @example
 * ```ts
 * const log = createLogger({ level: 'debug', defaultContext: { service: 'api' } });
 *
 * log.info('Server started', { port: 3000 });
 * log.error('Database connection failed', { error: err });
 * ```
 */
export function createLogger(config?: LoggerConfig) {
  const level: LogLevel = config?.level ?? 'info';
  const isProduction: boolean = config?.isProduction ?? (process.env.NODE_ENV === 'production');
  const defaultContext: LogContext = config?.defaultContext ?? {};

  const minSeverity = LOG_LEVEL_SEVERITY[level];

  function shouldLog(lvl: LogLevel): boolean {
    return LOG_LEVEL_SEVERITY[lvl] >= minSeverity;
  }

  function buildEntry(
    lvl: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): LogEntry {
    return {
      level: lvl,
      timestamp: new Date().toISOString(),
      message,
      context: { ...defaultContext, ...context },
      ...(error
        ? { error: { name: error.name, message: error.message, stack: error.stack } }
        : {}),
    };
  }

  function write(lvl: LogLevel, entry: LogEntry): void {
    if (isProduction) {
      _console.log(JSON.stringify(entry));
    } else {
      const ctx = entry.context && Object.keys(entry.context).length > 0
        ? `\n  ${JSON.stringify(entry.context, null, 2)}`
        : '';
      const err = entry.error
        ? `\n  ${entry.error.name}: ${entry.error.message}${entry.error.stack ? `\n${entry.error.stack}` : ''}`
        : '';
      const colorMap: Record<LogLevel, string> = {
        trace: '\x1b[90m',
        debug: '\x1b[36m',
        info: '\x1b[32m',
        warn: '\x1b[33m',
        error: '\x1b[31m',
        fatal: '\x1b[35m',
      };
      const reset = '\x1b[0m';
      const color = colorMap[lvl];
      _console.log(
        `${color}[${lvl.toUpperCase()}]${reset} ${entry.timestamp} — ${entry.message}${ctx}${err}`,
      );
    }
  }

  function log(
    lvl: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): void {
    if (!shouldLog(lvl)) return;
    const entry = buildEntry(lvl, message, context, error);
    write(lvl, entry);
  }

  return {
    /** Log at trace level. */
    trace(message: string, context?: LogContext): void {
      log('trace', message, context);
    },

    /** Log at debug level. */
    debug(message: string, context?: LogContext): void {
      log('debug', message, context);
    },

    /** Log at info level. */
    info(message: string, context?: LogContext): void {
      log('info', message, context);
    },

    /** Log at warn level. */
    warn(message: string, context?: LogContext): void {
      log('warn', message, context);
    },

    /** Log at error level, optionally attaching an Error object. */
    error(message: string, context?: LogContext | Error, error?: Error): void {
      if (context instanceof Error) {
        log('error', message, undefined, context);
      } else {
        log('error', message, context, error);
      }
    },

    /** Log at fatal level, optionally attaching an Error object. */
    fatal(message: string, context?: LogContext | Error, error?: Error): void {
      if (context instanceof Error) {
        log('fatal', message, undefined, context);
      } else {
        log('fatal', message, context, error);
      }
    },

    /**
     * Create a child logger with additional default context merged in.
     *
     * @param context - Context to merge on every log entry from the child.
     * @returns A new logger with the combined context.
     */
    child(context: LogContext) {
      return createLogger({
        level,
        isProduction,
        defaultContext: { ...defaultContext, ...context },
      });
    },
  };
}

/** Default logger instance using environment auto-detection. */
export const logger = createLogger();

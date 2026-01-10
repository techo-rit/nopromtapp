/**
 * Structured Logger for Observability
 * 
 * Outputs JSON logs with request correlation IDs for production debugging.
 * Compatible with Vercel LogDrain, DataDog, and other log aggregators.
 * 
 * Usage:
 *   const log = createLogger(requestId, userId);
 *   log.info('Generation started', { templateId });
 *   log.error('Credit deduction failed', { error: deductError });
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  requestId: string;
  userId?: string;
  message: string;
  durationMs?: number;
  context?: LogContext;
}

/**
 * Generate a unique request ID (UUID v4 compatible)
 */
export function generateRequestId(): string {
  // Use crypto.randomUUID if available (Node 19+), otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older Node versions
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create a logger instance bound to a request
 */
export function createLogger(requestId: string, userId?: string) {
  const startTime = Date.now();

  const log = (level: LogLevel, message: string, context?: LogContext) => {
    const entry: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      requestId,
      message,
      ...(userId && { userId }),
      ...(context && { context }),
    };

    // Output as single-line JSON for log aggregators
    const output = JSON.stringify(entry);

    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'debug':
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  };

  return {
    debug: (message: string, context?: LogContext) => log('debug', message, context),
    info: (message: string, context?: LogContext) => log('info', message, context),
    warn: (message: string, context?: LogContext) => log('warn', message, context),
    error: (message: string, context?: LogContext) => log('error', message, context),
    
    /**
     * Log with duration since request start
     */
    withDuration: (level: LogLevel, message: string, context?: LogContext) => {
      const durationMs = Date.now() - startTime;
      log(level, message, { ...context, durationMs });
    },

    /**
     * Get elapsed time since logger creation
     */
    elapsed: () => Date.now() - startTime,
  };
}

export type Logger = ReturnType<typeof createLogger>;

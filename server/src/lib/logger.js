/**
 * Structured Logger for Observability
 */

const isProduction = process.env.NODE_ENV === 'production';

export function sanitizeError(error) {
  if (!error) return { error: 'Unknown error' };

  if (error instanceof Error) {
    const sanitized = {
      message: error.message,
      name: error.name,
    };
    if (!isProduction && error.stack) {
      sanitized.stack = error.stack;
    }
    return sanitized;
  }

  if (typeof error === 'object') {
    const sanitized = { ...error };
    if (isProduction) {
      delete sanitized.stack;
    }
    return sanitized;
  }

  return { error: String(error) };
}

export function generateRequestId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createLogger(requestId, userId) {
  const startTime = Date.now();

  const log = (level, message, context) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      requestId,
      message,
      ...(userId && { userId }),
      ...(context && { context }),
    };

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
    debug: (message, context) => log('debug', message, context),
    info: (message, context) => log('info', message, context),
    warn: (message, context) => log('warn', message, context),
    error: (message, context) => log('error', message, context),
    withDuration: (level, message, context) => {
      const durationMs = Date.now() - startTime;
      log(level, message, { ...context, durationMs });
    },
    elapsed: () => Date.now() - startTime,
  };
}

/**
 * Structured server-side logger.
 *
 * Logs a fixed operation label + safe metadata, never raw error objects
 * (which can leak SQL details, stack traces, or internal paths).
 */

type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  operation: string
  message?: string
  timestamp: string
}

function log(level: LogLevel, operation: string, message?: string): void {
  const entry: LogEntry = {
    level,
    operation,
    timestamp: new Date().toISOString(),
  }
  if (message) {
    entry.message = message
  }

  if (level === 'error') {
    console.error(JSON.stringify(entry))
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry))
  } else {
    console.log(JSON.stringify(entry))
  }
}

export const logger = {
  info: (operation: string, message?: string) => log('info', operation, message),
  warn: (operation: string, message?: string) => log('warn', operation, message),
  error: (operation: string, message?: string) => log('error', operation, message),
}

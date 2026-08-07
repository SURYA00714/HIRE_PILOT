import { randomUUID } from 'crypto';

// ── Structured Logger with Correlation ID Support ──────────────────────────
// Every log entry is a JSON object with: timestamp, correlationId, service, action, level, data
// This replaces all console.log/console.error calls in the backend.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId: string;
  service: string;
  action: string;
  data?: Record<string, any>;
  error?: string;
  durationMs?: number;
}

class Logger {
  private service: string;
  private correlationId: string;

  constructor(service: string, correlationId?: string) {
    this.service = service;
    this.correlationId = correlationId || randomUUID();
  }

  /** Create a child logger with the same correlation ID but different service name */
  child(service: string): Logger {
    return new Logger(service, this.correlationId);
  }

  /** Generate a new correlation ID (call once per interview session) */
  static generateCorrelationId(): string {
    return randomUUID();
  }

  getCorrelationId(): string {
    return this.correlationId;
  }

  private emit(level: LogLevel, action: string, data?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      correlationId: this.correlationId,
      service: this.service,
      action,
    };
    if (data) entry.data = data;
    if (error) entry.error = `${error.message}\n${error.stack}`;

    // Output as single-line JSON for easy parsing by log aggregators
    const output = JSON.stringify(entry);

    switch (level) {
      case 'error':
        process.stderr.write(output + '\n');
        break;
      case 'warn':
        process.stderr.write(output + '\n');
        break;
      default:
        process.stdout.write(output + '\n');
    }
  }

  debug(action: string, data?: Record<string, any>) {
    this.emit('debug', action, data);
  }

  info(action: string, data?: Record<string, any>) {
    this.emit('info', action, data);
  }

  warn(action: string, data?: Record<string, any>) {
    this.emit('warn', action, data);
  }

  error(action: string, error: Error, data?: Record<string, any>) {
    this.emit('error', action, data, error);
  }

  /** Time an async operation and log its duration */
  async timed<T>(action: string, fn: () => Promise<T>, data?: Record<string, any>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.info(action, { ...data, durationMs: Date.now() - start });
      return result;
    } catch (err: any) {
      this.error(action, err, { ...data, durationMs: Date.now() - start });
      throw err;
    }
  }
}

/** Create a root logger for a service */
export function createLogger(service: string, correlationId?: string): Logger {
  return new Logger(service, correlationId);
}

export default Logger;

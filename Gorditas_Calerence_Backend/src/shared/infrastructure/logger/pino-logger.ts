import pino, { type Logger as PinoLogger } from 'pino';
import type { LogFields, Logger } from '../../application/ports/Logger';

class PinoAdapter implements Logger {
  constructor(private readonly p: PinoLogger) {}
  debug(msg: string, fields?: LogFields): void {
    this.p.debug(fields ?? {}, msg);
  }
  info(msg: string, fields?: LogFields): void {
    this.p.info(fields ?? {}, msg);
  }
  warn(msg: string, fields?: LogFields): void {
    this.p.warn(fields ?? {}, msg);
  }
  error(msg: string, fields?: LogFields): void {
    this.p.error(fields ?? {}, msg);
  }
  child(fields: LogFields): Logger {
    return new PinoAdapter(this.p.child(fields));
  }
}

export function createLogger(opts: { level: string; pretty: boolean; silent?: boolean }): { logger: Logger; pino: PinoLogger } {
  const p = pino({
    level: opts.silent ? 'silent' : opts.level,
    ...(opts.pretty ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } } } : {}),
    redact: ['req.headers.authorization', 'headers.authorization'],
  });
  return { logger: new PinoAdapter(p), pino: p };
}

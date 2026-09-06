import type { Clock } from '../../application/ports/Clock';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/** Reloj controlable para pruebas. */
export class FixedClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return new Date(this.current);
  }
  set(date: Date): void {
    this.current = date;
  }
  advanceMs(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

/** Registro de eventos de webhook para idempotencia (tabla de plataforma `stripe_events`). */
export interface StripeEventStore {
  /** true si el evento es nuevo y quedó reservado; false si ya se había recibido. */
  claim(eventId: string, type: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<void>;
  markError(eventId: string, error: string): Promise<void>;
}

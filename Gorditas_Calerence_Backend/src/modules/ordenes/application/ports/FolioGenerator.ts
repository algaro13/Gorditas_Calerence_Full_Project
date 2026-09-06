export interface FolioGenerator {
  next(now: Date): Promise<string>;
}

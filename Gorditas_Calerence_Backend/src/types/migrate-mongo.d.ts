declare module 'migrate-mongo' {
  import { Db, MongoClient } from 'mongodb';

  interface MigrationStatus {
    fileName: string;
    appliedAt: string;
  }

  export const database: {
    connect(): Promise<{ db: Db; client: MongoClient }>;
  };

  export const config: {
    set(config: any): void;
    read(): any;
  };

  export function up(db: Db, client?: MongoClient): Promise<string[]>;
  export function down(db: Db, client?: MongoClient): Promise<string[]>;
  export function status(db: Db): Promise<MigrationStatus[]>;
}

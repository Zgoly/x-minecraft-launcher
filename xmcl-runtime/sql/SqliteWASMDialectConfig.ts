import { DatabaseConnection } from 'kysely'
import { Database } from 'node-sqlite3-wasm'

export interface SqliteWASMDialectConfig {
  database: Database | (() => Promise<Database>)
  onCreateConnection?: (connection: DatabaseConnection) => Promise<void>
}

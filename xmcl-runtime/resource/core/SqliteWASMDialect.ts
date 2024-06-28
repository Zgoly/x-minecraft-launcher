import { DatabaseIntrospector, Dialect, DialectAdapter, Driver, Kysely, QueryCompiler, SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler } from 'kysely'
import { SqliteWASMDialectConfig } from './SqliteWASMDialectConfig'
import { SqliteWASMDriver } from './SqliteWASMDriver'

export class SqliteWASMDialect implements Dialect {
  constructor(readonly config: SqliteWASMDialectConfig) {
  }

  createDriver(): Driver {
    return new SqliteWASMDriver(this.config)
  }

  createQueryCompiler(): QueryCompiler {
    return new SqliteQueryCompiler()
  }

  createAdapter(): DialectAdapter {
    return new SqliteAdapter()
  }

  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new SqliteIntrospector(db)
  }
}

import EventEmitter from 'events'
import { Kysely, KyselyPlugin, OperationNodeTransformer, ParseJSONResultsPlugin, PluginTransformQueryArgs, PluginTransformResultArgs, PrimitiveValueListNode, QueryResult, RootOperationNode, SqliteDialect, UnknownRow, ValueNode } from 'kysely'
import { ImageStorage } from '~/imageStore'
import { Logger } from '~/logger'
import { ResourceContext } from './ResourceContext'
import { Database } from './schema'
import SQLite from 'node-sqlite3-wasm'
import { SqliteWASMDialect } from './SqliteWASMDialect'
import { join } from 'path'

class JSONPlugin implements KyselyPlugin {
  #tranformer = new JSONTransformer()

  transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
    if (args.node.kind === 'InsertQueryNode' || args.node.kind === 'UpdateQueryNode') {
      return this.#tranformer.transformNode(args.node)
    }
    return args.node
  }

  transformResult(args: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
    return Promise.resolve(args.result)
  }
}
class JSONTransformer extends OperationNodeTransformer {
  constructor() {
    super()
  }

  protected override transformValue(node: ValueNode): ValueNode {
    if (typeof node.value === 'object') {
      return ValueNode.create(JSON.stringify(node.value))
    }
    return node
  }

  protected override transformPrimitiveValueList(node: PrimitiveValueListNode): PrimitiveValueListNode {
    const values = node.values.map(v => typeof v === 'object' ? JSON.stringify(v) : v)
    node = PrimitiveValueListNode.create(values)
    return node
  }
}

export function createResourceContext(appDataPath: string, imageStore: ImageStorage, eventBus: EventEmitter, logger: Logger, delegates: Pick<ResourceContext, 'hash' | 'parse' | 'hashAndFileType'>) {
  const rawDb = new SQLite.Database(join(appDataPath, 'resources.sqlite'))
  const dialect = new SqliteWASMDialect({
    database: rawDb,
  })

  // Database interface is passed to Kysely's constructor, and from now on, Kysely
  // knows your database structure.
  // Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
  // to communicate with your database.
  const db = new Kysely<Database>({
    dialect,
    plugins: [new ParseJSONResultsPlugin(), new JSONPlugin()],
    log: (e) => {
      if (e.level === 'error') {
        logger.warn(e.query.sql + '\n[' + e.query.parameters.join(', ') + ']')
      }
    },
  })

  const context: ResourceContext = {
    db,
    getSqlite: () => Promise.resolve(rawDb),
    image: imageStore,
    hash: delegates.hash,
    hashAndFileType: delegates.hashAndFileType,
    parse: delegates.parse,
    eventBus,
    logger,
  }

  return context
}

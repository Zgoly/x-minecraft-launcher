import { ResourceDomain, ResourceMetadata, ResourceType } from '@xmcl/runtime-api'
import { AbstractLevel, AbstractSublevel } from 'abstract-level'
import { remove } from 'fs-extra'
import { Logger } from '~/logger'
import { sql } from 'kysely'
import { ResourceContext } from './ResourceContext'
import { ResourceSnapshotTable, ResourceTable } from './schema'

interface IResourceData extends ResourceMetadata {
  /**
   * The human readable name or alias
   */
  name: string
  hashes: {
    sha1: string
    sha256?: string
  }
  icons: string[]
  /**
   * The tag on this file. Used for indexing.
   */
  tags: string[]
  /**
   * The uris of the resource. Used for indexing
   */
  uris: string[]
}

interface ResourceEntry {
  ino: number
  ctime: number
  mtime: number
  size: number
  fileType: string
  /**
   * The sha1 string
   */
  sha1: string
}

interface ResourceEntryCache extends ResourceEntry {
  /**
   * The basename of the file including the extension
   */
  fileName: string
  domain: ResourceDomain
}

/**
 * The total snapshot database for file cache
 */
type ResourceSnapshotDatabase = AbstractLevel<Buffer, string, ResourceEntryCache>
/**
 * The domains like `!mods!` or `!resourcepacks!` prefixed sub-level of `ResourceSnapshotDatabase`
 *
 * The key is the file name, and the value is the resource entry
 */
type ResourceFileNameSnapshotDatabase = AbstractSublevel<ResourceSnapshotDatabase, Buffer, string, ResourceEntryCache>
/**
 * The sha1 to resource metadata database
 */
type ResourceMetaDatabase = AbstractLevel<Buffer, string, IResourceData>

/**
 * Migrate the domain cache entry to the new sqlite database
 */
async function migrateDomain(snapshot: ResourceSnapshotDatabase, current: ResourceContext, domain: ResourceDomain) {
  const db = snapshot.sublevel(domain, { valueEncoding: 'json' }) as ResourceFileNameSnapshotDatabase
  for await (const cache of db.values()) {
    const transformed: ResourceSnapshotTable = {
      ino: cache.ino,
      ctime: cache.ctime,
      mtime: cache.mtime,
      size: cache.size,
      fileType: cache.fileType,
      sha1: cache.sha1,
      domainedPath: `${domain}/${cache.fileName}`,
    }
    await current.db.insertInto('snapshots')
      .values(transformed)
      .onConflict(oc => oc.doNothing())
      .execute()
      .catch(() => { /* ignore error */ })
  }
}

export async function migrateImageProtocolChange({ db, logger }: ResourceContext) {
  // Update all image://<id> to http://launcher/image/<id>
  try {
    await sql`update icons set icon = REPLACE(icon, 'image://', 'http://launcher/image/') where "icon" like 'image:%';`.execute(db)
  } catch (e) {
    logger.warn('Fail to migrate image protocol change')
    logger.error(e as any)
  }
}

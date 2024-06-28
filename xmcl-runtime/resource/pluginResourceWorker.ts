import { LauncherAppPlugin } from '~/app'
import { createLazyWorker } from '../worker'
import createResourceDbWorker from './resourceDbWorkerEntry?worker'
import createResourceWorker from './resourceWorkerEntry?worker'
import { ResourceWorker, kResourceDatabaseWorker, kResourceWorker } from './worker'

export const pluginResourceWorker: LauncherAppPlugin = async (app) => {
  const logger = app.getLogger('ResourceWorker')
  const resourceWorker: ResourceWorker = createLazyWorker(createResourceWorker, ['checksum', 'copyPassively', 'hash', 'hashAndFileType', 'parse', 'fingerprint'], logger)
  app.registry.register(kResourceWorker, resourceWorker)

  const dbLogger = app.getLogger('ResourceDbWorker')
  const dbWorker = createLazyWorker(createResourceDbWorker, [], dbLogger)
  app.registry.register(kResourceDatabaseWorker, dbWorker)
}

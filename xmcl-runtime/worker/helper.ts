import { MessagePort, parentPort } from 'worker_threads'
import type { WorkPayload } from './index'

if (parentPort !== null) {
  main(parentPort)
}
let semaphore = 0
let handlers: Record<string, Function> = {}

function main(port: MessagePort) {
  port.on('message', (message: WorkPayload) => {
    const id = message.id
    const handler = (handlers as any as Record<string, (...message: any[]) => Promise<any> | AsyncGenerator>)[message.type]
    if (handler) {
      semaphore += 1
      const result = handler(...message.args)
      const isAsyncGenerator = (v: unknown): v is AsyncGenerator => {
        return !!v && typeof (v as any).next === 'function' && typeof (v as any)[Symbol.asyncIterator] === 'function'
      }
      if (isAsyncGenerator(result)) {
      } else {
        result.then((result) => {
          port.postMessage({ result, id })
        }, (error) => {
          port.postMessage({ error, id })
        }).finally(() => {
          semaphore -= 1
          if (semaphore <= 0) {
            port.postMessage('idle')
          }
        })
      }
    }
  })
}

export function setHandler(handler: any) {
  handlers = handler
}

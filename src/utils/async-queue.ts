import { CircularBuffer } from './circular-buffer'
import { Emitter } from './emitter'

type Resolve = () => void
type Reject = (e: unknown) => void
type Operation = (resolve: Resolve, reject: Reject) => void | Promise<void>

type QueueItem = {
  resolve: Resolve
  reject: Reject
  operation: Operation
}

export class AsyncQueue {
  private isExecuting = false
  private readonly queue = new CircularBuffer<QueueItem>()
  private readonly idleEmitter = new Emitter()

  async add(operation: Operation): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        operation,
        resolve,
        reject,
      })
      void this.startExecuting()
    })
  }

  async onIdle(): Promise<void> {
    if (this.isExecuting) {
      return this.idleEmitter.onEmit()
    }
  }

  private async startExecuting() {
    if (this.isExecuting) return
    this.isExecuting = true

    let item = this.queue.pop()
    while (item) {
      const { operation, resolve, reject } = item
      try {
        await operation(resolve, reject)
        resolve()
      } catch (e) {
        reject(e)
      }
      item = this.queue.pop()
    }

    this.isExecuting = false
    this.idleEmitter.emit()
  }
}

export interface CicrularBufferOptions {
  initialSize?: number
}

export class CircularBuffer<T> {
  private array: T[] = []
  private head = 0
  private tail = 0
  private size: number

  constructor(options?: CicrularBufferOptions) {
    this.size = options?.initialSize ?? 256
  }

  get length(): number {
    let l = this.head - this.tail
    if (l < 0) l += this.size
    return l
  }

  push(item: T): void {
    this.array[this.head] = item
    this.head = (this.head + 1) % this.size
    if (this.head === this.tail) {
      if (this.head === 0) {
        this.head += this.size
      } else {
        const start = this.array.slice(0, this.head)
        const end = this.array.slice(this.head, this.size)
        this.array = start.concat(Array(this.size), end)
        this.tail += this.size
      }
      this.size *= 2
    }
  }

  pop(): T | undefined {
    if (this.head === this.tail) {
      return undefined
    }
    const item = this.array[this.tail]
    delete this.array[this.tail]
    this.tail = (this.tail + 1) % this.size
    return item
  }
}

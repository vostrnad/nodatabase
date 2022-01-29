export class Emitter {
  private promise!: Promise<void>
  private resolve!: () => void

  constructor() {
    this.createPromise()
  }

  async onEmit(): Promise<void> {
    return this.promise
  }

  emit(): void {
    this.resolve()
    this.createPromise()
  }

  private createPromise() {
    this.promise = new Promise((resolve) => (this.resolve = resolve))
  }
}

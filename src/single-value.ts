import { Storage } from './storage'
import { PartialDeepObjects, Serializable } from './types'
import { deepClone, merge } from './utils/serializable'

export type SingleValueOptions<T> = {
  /**
   * The default value to use if no stored value is found.
   */
  defaultValue: T
  /**
   * Directory to store data in.
   */
  dirPath: string
  /**
   * Optional name for the data file. If left undefined, a default name will be
   * used. You must specify this when using more than one database in a
   * directory.
   */
  fileName?: string
}

export class SingleValue<T extends Serializable> extends Storage<T, null> {
  constructor(options: SingleValueOptions<T>) {
    super(options)
  }

  get value(): T {
    return deepClone(this.data)
  }

  /**
   * Replaces the stored value with a new value.
   */
  async set(value: T): Promise<void> {
    await this.replace(deepClone(value))
  }

  /**
   * Updates the stored value by deeply merging it with the given update. If
   * the value stored is not an object this has the same effect as calling
   * `set`.
   */
  async update(update: PartialDeepObjects<T>): Promise<void> {
    await this.replace(() => {
      // little hack to make use of merge directly
      const doc = { value: this.value }
      merge(doc, { value: update })
      return doc.value
    })
  }

  /* istanbul ignore next */
  protected applyOperation(): T {
    throw new Error('Method not allowed')
  }

  /* istanbul ignore next */
  protected serializeOperation(): string {
    throw new Error('Method not allowed')
  }

  /* istanbul ignore next */
  protected deserializeOperation(): null {
    throw new Error('Method not allowed')
  }
}

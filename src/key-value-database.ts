import { Storage } from './storage'
import { PartialDeepObjects, Serializable } from './types'
import { deepClone, merge } from './utils/serializable'
import { hasAnyOfAtKey, hasKey, hasStringAtKey } from './utils/validation'

type StorageData<T extends Serializable> = Record<string, T>

type Operation<T extends Serializable> =
  | {
      type: 'create'
      key: string
      data: T
    }
  | {
      type: 'update'
      key: string
      data: PartialDeepObjects<T>
    }
  | {
      type: 'delete'
      key: string
    }

export type KeyValueDatabaseOptions = {
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
  /**
   * Whether to use journaling. You can also set a custom maximum length of the
   * journal file. Defaults to `true`.
   */
  journal?: boolean | { maxLines: number }
  /**
   * Maximum number of items that are allowed to be stored.
   */
  maxItems?: number
}

export class KeyValueDatabase<T extends Serializable> extends Storage<
  StorageData<T>,
  Operation<T>
> {
  private itemCount: number

  private readonly maxItems?: number

  constructor(options: KeyValueDatabaseOptions) {
    super({
      defaultValue: {},
      journal: true,
      ...options,
    })

    this.maxItems = options.maxItems

    this.itemCount = Object.keys(this.data).length
  }

  get size(): number {
    return this.itemCount
  }

  get keys(): string[] {
    return Object.keys(this.data)
  }

  get values(): T[] {
    return Object.values(this.data).map(deepClone)
  }

  /**
   * Returns true if the given key exists in the database, false otherwise.
   */
  has(key: string): boolean {
    return key in this.data
  }

  /**
   * Returns the value stored at the given key. Returns undefined if the key
   * does not hold a value.
   */
  get(key: string): T | undefined {
    return deepClone(this.data[key])
  }

  /**
   * Performs the specified action for each key-value pair in the database.
   */
  forEach(callbackfn: (value: T, key: string) => void): void {
    Object.entries(this.data).forEach(([key, value]) =>
      callbackfn(deepClone(value), key),
    )
  }

  /**
   * Stores the given value at the given key. If there already exists a value
   * at this key it is overwritten.
   */
  async set(key: string, value: T): Promise<void> {
    await this.commitOperation(() => {
      if (!(key in this.data)) {
        if (this.maxItems !== undefined && this.itemCount >= this.maxItems) {
          throw new Error('Maximum number of items exceeded')
        }

        this.itemCount++
      }
      return {
        type: 'create',
        key,
        data: value,
      }
    })
  }

  /**
   * Updates the value at the given key by deeply merging it with the given
   * update. If the value stored is not an object this has the same effect as
   * calling `set`.
   */
  async update(key: string, update: PartialDeepObjects<T>): Promise<void> {
    await this.commitOperation({
      type: 'update',
      key,
      data: update,
    })
  }

  /**
   * Deletes the value at the given key.
   */
  async delete(key: string): Promise<void> {
    await this.commitOperation(() => {
      if (key in this.data) {
        this.itemCount--
      }
      return {
        type: 'delete',
        key,
      }
    })
  }

  /**
   * Deletes all values in the database.
   */
  async clear(): Promise<void> {
    await super.clear(() => {
      this.itemCount = 0
    })
  }

  protected applyOperation(
    data: StorageData<T>,
    operation: Operation<T>,
  ): StorageData<T> {
    switch (operation.type) {
      case 'create':
        data[operation.key] = deepClone(operation.data)
        break
      case 'update':
        if (!(operation.key in data)) {
          throw new Error('Cannot update missing value')
        }
        merge(data, { [operation.key]: operation.data })
        break
      case 'delete':
        delete data[operation.key]
    }

    return data
  }

  protected deserializeOperation(input: string): Operation<T> {
    const operation = JSON.parse(input) as unknown

    if (typeof operation !== 'object' || operation === null) {
      throw new Error('Failed to deserialize operation')
    }

    if (
      !hasAnyOfAtKey(operation, 'type', ['create', 'update', 'delete'] as const)
    ) {
      throw new Error('Unknown operation type')
    }

    if (!hasStringAtKey(operation, 'key')) {
      throw new Error('Missing key in operation')
    }

    switch (operation.type) {
      case 'create':
      case 'update':
        if (!hasKey(operation, 'data')) {
          throw new Error('Missing data in operation')
        }
        break
      case 'delete':
        // delete does not require data
        break
    }

    return operation as Operation<T>
  }

  protected serializeOperation(operation: Operation<T>): string {
    return JSON.stringify(operation)
  }
}

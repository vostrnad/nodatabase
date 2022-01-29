import { Storage } from './storage'
import { PartialDeep, PartialDeepObjects, Serializable } from './types'
import { deepClone, merge, partialEqual } from './utils/serializable'
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
      keys: string[]
      data: PartialDeepObjects<T>
    }
  | {
      type: 'delete'
      keys: string[]
    }

type Indexable = string | number | boolean | null

type QueryType<T> = PartialDeep<T>
type UpdateType<T> = PartialDeepObjects<T>

export type Document = Record<string, Serializable>

export type DocumentDatabaseOptions<T extends Document> = {
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
   * Maximum number of documents that are allowed to be stored.
   */
  maxDocuments?: number
  /**
   * An array of fields that should be indexed for fast searching.
   */
  indexedFields?: Array<keyof T>
}

export class DocumentDatabase<T extends Document> extends Storage<
  StorageData<T>,
  Operation<T>
> {
  private documentCount: number
  private key: number
  private readonly indexes: Record<
    keyof never,
    Map<Indexable, Set<string>>
  > | null

  private readonly maxDocuments?: number

  constructor(options: DocumentDatabaseOptions<T>) {
    super({
      defaultValue: {},
      journal: true,
      ...options,
    })

    this.maxDocuments = options.maxDocuments

    const keys = Object.keys(this.data)
    this.documentCount = keys.length
    this.key = Math.max(...keys.map(Number), 0)

    if (options.indexedFields) {
      this.indexes = {}

      for (const fieldName of options.indexedFields) {
        this.indexes[fieldName] = new Map()

        for (const [key, document] of Object.entries(this.data)) {
          if (!(fieldName in document)) {
            continue
          }

          const value = document[fieldName]
          if (!this.isIndexable(value)) {
            continue
          }

          let index = this.indexes[fieldName].get(value)
          if (!index) {
            index = new Set()
            this.indexes[fieldName].set(value, index)
          }

          index.add(key)
        }
      }
    } else {
      this.indexes = null
    }
  }

  get size(): number {
    return this.documentCount
  }

  /**
   * Finds and returns the first document that matches the query. Returns
   * undefined if no documents match.
   *
   * @param query An object that should partially match the desired document.
   * Nested objects are partially matched deeply. Arrays must partially match
   * all elements.
   */
  findOne(query: QueryType<T>): T | undefined {
    const found = this.searchIndex(query).find((key) =>
      partialEqual(this.data[key], query),
    )
    return found ? deepClone(this.data[found]) : undefined
  }

  /**
   * Returns an array of documents that match the query.
   *
   * @param query An object that should partially match the desired documents.
   * Nested objects are partially matched deeply. Arrays must partially match
   * all elements.
   */
  findMany(query: QueryType<T>): T[] {
    return this.searchIndex(query)
      .filter((key) => partialEqual(this.data[key], query))
      .map((key) => this.data[key])
      .map(deepClone)
  }

  /**
   * Inserts a new document into the database.
   */
  async insert(document: T): Promise<void> {
    await this.commitOperation(() => {
      if (
        this.maxDocuments !== undefined &&
        this.documentCount >= this.maxDocuments
      ) {
        throw new Error('Maximum number of documents exceeded')
      }

      this.documentCount++

      const newKey = (++this.key).toString()

      if (this.indexes) {
        Object.keys(document).forEach((fieldName) => {
          const value = document[fieldName]
          if (this.isIndexable(value)) {
            this.addToIndex(fieldName, value, [newKey])
          }
        })
      }

      return {
        type: 'create',
        key: newKey,
        data: document,
      }
    })
  }

  /**
   * Updates all database documents that match the query.
   *
   * @param query An object that should partially match the desired documents.
   * Nested objects are partially matched deeply. Arrays must partially match
   * all elements.
   */
  async update(query: QueryType<T>, update: UpdateType<T>): Promise<void> {
    await this.commitOperation(() => {
      const keys = this.searchIndex(query).filter((key) =>
        partialEqual(this.data[key], query),
      )

      if (this.indexes) {
        Object.keys(update).forEach((fieldName) => {
          // remove old values from index
          keys.forEach((key) => {
            const oldValue = this.data[key][fieldName]
            if (this.isIndexable(oldValue)) {
              this.removeFromIndex(fieldName, oldValue, key)
            }
          })

          // add new value to index
          const newValue = update[fieldName]
          if (this.isIndexable(newValue)) {
            this.addToIndex(fieldName, newValue, keys)
          }
        })
      }

      return {
        type: 'update',
        keys,
        data: update,
      }
    })
  }

  /**
   * Deletes all database documents that match the query.
   *
   * @param query An object that should partially match the desired documents.
   * Nested objects are partially matched deeply. Arrays must partially match
   * all elements.
   */
  async delete(query: QueryType<T>): Promise<void> {
    await this.commitOperation(() => {
      const keys = this.searchIndex(query).filter((key) =>
        partialEqual(this.data[key], query),
      )
      this.documentCount -= keys.length

      if (this.indexes) {
        keys.forEach((key) => {
          const document = this.data[key]

          Object.keys(document).forEach((fieldName) => {
            const oldValue = document[fieldName]
            if (this.isIndexable(oldValue)) {
              this.removeFromIndex(fieldName, oldValue, key)
            }
          })
        })
      }

      return {
        type: 'delete',
        keys,
      }
    })
  }

  /**
   * Deletes all documents in the database.
   */
  async clear(): Promise<void> {
    await super.clear(() => {
      this.documentCount = 0
      this.key = 0

      if (this.indexes) {
        Object.values(this.indexes).forEach((index) => index.clear())
      }
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
        operation.keys.forEach((key) => {
          if (!(key in data)) {
            throw new Error('Cannot update missing value')
          }
          merge(data[key], operation.data)
        })
        break
      case 'delete':
        operation.keys.forEach((key) => {
          delete data[key]
        })
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

    switch (operation.type) {
      case 'create':
        if (!hasStringAtKey(operation, 'key')) {
          throw new Error('Missing key in operation')
        }
        if (!hasKey(operation, 'data')) {
          throw new Error('Missing data in operation')
        }
        break
      case 'update':
        if (!hasKey(operation, 'keys')) {
          throw new Error('Missing keys in operation')
        }
        if (!hasKey(operation, 'data')) {
          throw new Error('Missing data in operation')
        }
        break
      case 'delete':
        if (!hasKey(operation, 'keys')) {
          throw new Error('Missing keys in operation')
        }
        break
    }

    return operation as Operation<T>
  }

  protected serializeOperation(operation: Operation<T>): string {
    return JSON.stringify(operation)
  }

  private addToIndex(fieldName: string, value: Indexable, keys: string[]) {
    const index = this.getOrCreateIndex(fieldName, value)
    if (index) {
      keys.forEach((key) => index.add(key))
    }
  }

  private removeFromIndex(fieldName: string, value: Indexable, key: string) {
    if (this.indexes?.[fieldName]) {
      const index = this.indexes[fieldName].get(value)
      if (!index) {
        throw new Error('Cannot find index for value')
      }
      index.delete(key)
      if (index.size === 0) {
        this.indexes[fieldName].delete(value)
      }
    }
  }

  private searchIndex(query: QueryType<T>): string[] {
    if (!this.indexes) {
      return Object.keys(this.data)
    }

    const indexes: Array<Set<string>> = []

    for (const fieldName of Object.keys(query)) {
      const index = this.getIndexIfExists(fieldName, query[fieldName])
      if (index) {
        if (index.size === 0) {
          return []
        }
        indexes.push(index)
      }
    }

    if (indexes.length === 0) {
      return Object.keys(this.data)
    }

    if (indexes.length === 1) {
      return Array.from(indexes[0])
    }

    const sortedIndexes = indexes.sort((a, b) =>
      a.size < b.size ? -1 : a.size > b.size ? 1 : 0,
    )

    const [smallestIndex, ...otherIndexes] = sortedIndexes

    return Array.from(smallestIndex).filter((key) =>
      otherIndexes.every((index) => index.has(key)),
    )
  }

  private getIndexIfExists(fieldName: string, value: unknown) {
    if (!this.isIndexable(value)) {
      return
    }
    const fieldIndexes = this.indexes?.[fieldName]
    if (!fieldIndexes) {
      return
    }
    return fieldIndexes.get(value) || new Set()
  }

  private getOrCreateIndex(fieldName: string, value: Indexable) {
    if (this.indexes?.[fieldName]) {
      let index = this.indexes[fieldName].get(value)
      if (!index) {
        index = new Set()
        this.indexes[fieldName].set(value, index)
      }
      return index
    }
  }

  private isIndexable(value: unknown): value is Indexable {
    return (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    )
  }
}

import fs from 'fs'
import path from 'path'
import { PartialSerializable, Serializable } from './types'
import { AsyncQueue } from './utils/async-queue'
import { deepClone } from './utils/serializable'

const FILE_ENCODING = 'utf8'

export type StorageOptions<T> = {
  defaultValue: T
  dirPath: string
  fileName?: string
  journal?: boolean | { maxLines: number }
}

export abstract class Storage<
  T extends Serializable,
  O extends PartialSerializable,
> {
  protected data: T

  private journalLines = 0
  private journalFileHandle: fs.promises.FileHandle | null = null
  private readonly queue = new AsyncQueue()

  private readonly defaultValue: T
  private readonly dataFilePath: string
  private readonly updateFilePath: string
  private readonly journalFilePath: string
  private readonly useJournal: boolean
  private readonly journalMaxLines: number

  protected constructor(options: StorageOptions<T>) {
    const fileName = options.fileName ?? 'data'

    this.dataFilePath = path.join(options.dirPath, `${fileName}.json`)
    this.updateFilePath = path.join(options.dirPath, `${fileName}.update.json`)
    this.journalFilePath = path.join(options.dirPath, `${fileName}.journal`)

    if (options.journal) {
      this.useJournal = true
      this.journalMaxLines =
        typeof options.journal === 'object' ? options.journal.maxLines : 1000
    } else {
      this.useJournal = false
      this.journalMaxLines = 0
    }

    this.defaultValue = deepClone(options.defaultValue)
    this.data = deepClone(this.defaultValue)

    /* eslint-disable node/no-sync */
    fs.mkdirSync(options.dirPath, { recursive: true })
    this.loadFilesSync()
    /* eslint-enable node/no-sync */
  }

  protected abstract serializeOperation(operation: O): string

  protected abstract deserializeOperation(input: string): O

  protected abstract applyOperation(data: T, operation: O): T

  private applyPatch(data: T, patch: O[]): T {
    for (const operation of patch) {
      data = this.applyOperation(data, operation)
    }
    return data
  }

  protected async replace(value: T | (() => T)): Promise<void> {
    await this.queue.add(async (resolve) => {
      if (typeof value === 'function') {
        value = value()
      }
      this.data = value

      await this.commitFile(resolve)
    })
  }

  protected async commitOperation(operation: O | (() => O)): Promise<void> {
    await this.queue.add(async (resolve) => {
      if (typeof operation === 'function') {
        operation = operation()
      }
      this.data = this.applyOperation(this.data, operation)

      if (this.useJournal) {
        await this.commitJournal(operation, resolve)
      } else {
        await this.commitFile(resolve)
      }
    })
  }

  protected async clear(afterfn: () => void): Promise<void> {
    await this.queue.add(async () => {
      this.data = deepClone(this.defaultValue)
      this.journalLines = 0
      await this.deleteFileIfExists(this.dataFilePath)
      await this.closeJournalFile()
      await this.deleteFileIfExists(this.journalFilePath)
      await this.writeFile(this.dataFilePath, JSON.stringify(this.data))
      afterfn()
    })
  }

  /**
   * Waits for all database updates to commit, then closes all opened files.
   * This method must be called before creating a new database instance that
   * will use the same data files.
   */
  async close(): Promise<void> {
    await this.queue.onIdle()
    await this.closeJournalFile()
  }

  /**
   * Returns a promise that fulfills when the database queue is empty. This can
   * be used to make sure all asynchronous updates have been committed.
   */
  async onIdle(): Promise<void> {
    return this.queue.onIdle()
  }

  private async commitFile(resolve: () => void) {
    await this.writeFile(this.updateFilePath, JSON.stringify(this.data))
    resolve()
    await this.deleteFileIfExists(this.dataFilePath)
    await fs.promises.rename(this.updateFilePath, this.dataFilePath)
  }

  private async commitJournal(operation: O, resolve: () => void) {
    await this.appendToJournal(this.serializeOperation(operation) + '\n')
    this.journalLines++

    resolve()

    if (this.journalLines >= this.journalMaxLines) {
      await this.closeJournalFile()
      this.journalLines = 0
      await this.writeFile(this.updateFilePath, JSON.stringify(this.data))
      await this.deleteFileIfExists(this.dataFilePath)
      await this.deleteFileIfExists(this.journalFilePath)
      await fs.promises.rename(this.updateFilePath, this.dataFilePath)
    }
  }

  /* eslint-disable node/no-sync */ // sync methods below
  private loadFilesSync() {
    const dataFile = this.readJsonFileIfExistsSync(this.dataFilePath)

    if (!dataFile) {
      const updateFile = this.readJsonFileIfExistsSync(this.updateFilePath)

      if (updateFile) {
        // rename update file to data file
        this.deleteFileIfExistsSync(this.dataFilePath)
        this.deleteFileIfExistsSync(this.journalFilePath)
        fs.renameSync(this.updateFilePath, this.dataFilePath)
        this.deleteFileIfExistsSync(this.updateFilePath)

        this.data = updateFile.parsed
      } else {
        // delete anything left over and start from scratch
        this.deleteFileIfExistsSync(this.dataFilePath)
        this.deleteFileIfExistsSync(this.updateFilePath)
        this.deleteFileIfExistsSync(this.journalFilePath)

        this.writeFileSync(this.dataFilePath, JSON.stringify(this.data))
      }

      return
    }

    const journalFile = this.readJournalFileIfExistsSync(this.journalFilePath)

    if (journalFile) {
      const data = this.applyPatch(dataFile.parsed, journalFile)
      this.writeFileSync(this.updateFilePath, JSON.stringify(data))
      this.deleteFileIfExistsSync(this.dataFilePath)
      this.deleteFileIfExistsSync(this.journalFilePath)
      fs.renameSync(this.updateFilePath, this.dataFilePath)

      this.data = data
      return
    }

    this.deleteFileIfExistsSync(this.updateFilePath)
    this.deleteFileIfExistsSync(this.journalFilePath)

    this.data = dataFile.parsed
  }

  private readFileSync(filePath: string) {
    return fs.readFileSync(filePath).toString(FILE_ENCODING)
  }

  private writeFileSync(filePath: string, data: string) {
    fs.writeFileSync(filePath, data, { encoding: FILE_ENCODING })
  }

  private readFileIfExistsSync(filePath: string) {
    try {
      return this.readFileSync(filePath)
    } catch {
      // ignore error
    }
  }

  private readJsonFileIfExistsSync(filePath: string) {
    try {
      const raw = this.readFileSync(filePath)
      const parsed = JSON.parse(raw) as T
      return {
        raw,
        parsed,
      }
    } catch {
      return undefined
    }
  }

  private readJournalFileIfExistsSync(filePath: string) {
    const file = this.readFileIfExistsSync(filePath)
    if (!file) {
      return undefined
    }
    const patch: O[] = []
    const lines = file.trim().split('\n')
    for (const line of lines) {
      try {
        const operation = this.deserializeOperation(line)
        patch.push(operation)
      } catch {
        // stop reading the journal on first error
        break
      }
    }
    return patch
  }

  private deleteFileIfExistsSync(filePath: string) {
    try {
      fs.unlinkSync(filePath)
    } catch {
      // ignore error
    }
  }
  /* eslint-enable node/no-sync */

  private async writeFile(filePath: string, data: string) {
    await fs.promises.writeFile(filePath, data, { encoding: FILE_ENCODING })
  }

  private async deleteFileIfExists(filePath: string) {
    try {
      await fs.promises.unlink(filePath)
    } catch {
      // ignore error
    }
  }

  private async appendToJournal(data: string) {
    if (!this.journalFileHandle) {
      this.journalFileHandle = await fs.promises.open(this.journalFilePath, 'a')
    }
    await this.journalFileHandle.write(data, null, FILE_ENCODING)
  }

  private async closeJournalFile() {
    if (this.journalFileHandle) {
      await this.journalFileHandle.close()
      this.journalFileHandle = null
    }
  }
}

import fs from 'fs'
import path from 'path'
import { Document, DocumentDatabase } from '../../src'
import { createDocumentDatabase } from '../factory'
import {
  generate,
  randomBoolean,
  randomInteger,
  removeAllFiles,
  tmpDirPath,
} from '../utils'

const DIR_PATH = path.join(tmpDirPath, './document-database')

jest.setTimeout(60 * 1000)

describe('DocumentDatabase', () => {
  let db: DocumentDatabase<Document>

  beforeEach(async () => {
    await removeAllFiles(DIR_PATH)

    db = await createDocumentDatabase({
      dirPath: DIR_PATH,
    })
  })

  afterAll(async () => {
    await removeAllFiles(DIR_PATH)
    await fs.promises.rmdir(DIR_PATH)
  })

  it('should return undefined for an empty database', () => {
    expect(db.findOne({})).toBeUndefined()
  })

  it('should return an object for an empty query', async () => {
    await db.insert({ name: 'Document' })
    expect(db.findOne({})).toEqual({ name: 'Document' })
  })

  it('should return the correct object', async () => {
    await Promise.all([
      db.insert({ name: 'one', value: 1 }),
      db.insert({ name: 'two', value: 2 }),
      db.insert({ name: 'three', value: 3 }),
    ])
    expect(db.findOne({ name: 'two' })).toEqual({ name: 'two', value: 2 })
  })

  it('should sort and limit found documents', async () => {
    await Promise.all([
      db.insert({ key1: 'a', key2: 2 }),
      db.insert({ key1: 'b', key2: 3 }),
      db.insert({ key1: 'c', key2: 1 }),
      db.insert({ key1: null, key2: null }),
    ])
    expect(db.findMany({}, { sort: [{ key1: 'asc' }] })).toEqual([
      { key1: 'a', key2: 2 },
      { key1: 'b', key2: 3 },
      { key1: 'c', key2: 1 },
      { key1: null, key2: null },
    ])
    expect(db.findMany({}, { sort: [{ key1: 'desc' }] })).toEqual([
      { key1: null, key2: null },
      { key1: 'c', key2: 1 },
      { key1: 'b', key2: 3 },
      { key1: 'a', key2: 2 },
    ])
    expect(db.findMany({}, { sort: [{ key2: 'asc' }] })).toEqual([
      { key1: 'c', key2: 1 },
      { key1: 'a', key2: 2 },
      { key1: 'b', key2: 3 },
      { key1: null, key2: null },
    ])
    expect(db.findMany({}, { sort: [{ key2: 'desc' }] })).toEqual([
      { key1: null, key2: null },
      { key1: 'b', key2: 3 },
      { key1: 'a', key2: 2 },
      { key1: 'c', key2: 1 },
    ])
    expect(db.findMany({}, { sort: [{ key1: 'asc' }], limit: 1 })).toEqual([
      { key1: 'a', key2: 2 },
    ])
    expect(db.findMany({}, { sort: [{ key1: 'desc' }], limit: 2 })).toEqual([
      { key1: null, key2: null },
      { key1: 'c', key2: 1 },
    ])
    expect(db.findMany({}, { sort: [{ key2: 'asc' }], limit: 1 })).toEqual([
      { key1: 'c', key2: 1 },
    ])
    expect(db.findMany({}, { sort: [{ key2: 'desc' }], limit: 2 })).toEqual([
      { key1: null, key2: null },
      { key1: 'b', key2: 3 },
    ])
  })

  it('should sort found documents using multiple deep keys', async () => {
    await Promise.all([
      db.insert({ a: { b: 'a' }, c: { d: 1 } }),
      db.insert({ a: { b: 'b' }, c: { d: 1 } }),
      db.insert({ a: { b: 'a' }, c: { d: 2 } }),
      db.insert({ a: { b: 'b' }, c: { d: 2 } }),
      db.insert({ a: { b: 'b' }, c: { d: 2 } }),
    ])
    expect(
      db.findMany({}, { sort: [{ a: { b: 'asc' } }, { c: { d: 'desc' } }] }),
    ).toEqual([
      { a: { b: 'a' }, c: { d: 2 } },
      { a: { b: 'a' }, c: { d: 1 } },
      { a: { b: 'b' }, c: { d: 2 } },
      { a: { b: 'b' }, c: { d: 2 } },
      { a: { b: 'b' }, c: { d: 1 } },
    ])
  })

  it('should sort numbers before strings', async () => {
    await Promise.all([
      db.insert({ value: '1' }),
      db.insert({ value: 1 }),
      db.insert({ value: '2' }),
      db.insert({ value: 2 }),
    ])
    expect(db.findMany({}, { sort: [{ value: 'asc' }] })).toEqual([
      { value: 1 },
      { value: 2 },
      { value: '1' },
      { value: '2' },
    ])
  })

  it('should update an object', async () => {
    db = await createDocumentDatabase({
      dirPath: DIR_PATH,
      journal: { maxLines: 5 },
      indexedFields: ['key3', 'key4'],
    })
    await db.insert({ name: 'object' })
    await Promise.all([
      db.update({ name: 'object' }, { key1: 'value1' }),
      db.update({ name: 'object' }, { key2: 'value2' }),
      db.update({ name: 'object' }, { key3: 'value3' }),
      db.update({ name: 'object' }, { key4: 'value4' }),
      db.update({ name: 'object' }, { key5: 'value5' }),
    ])
    expect(db.findOne({ key3: 'value3' })).toEqual({
      name: 'object',
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
      key4: 'value4',
      key5: 'value5',
    })
  })

  it('should delete a document', async () => {
    await db.insert({ delete: 'this' })
    expect(db.findMany({ delete: 'this' })).toHaveLength(1)
    await db.delete({ delete: 'this' })
    expect(db.findMany({ delete: 'this' })).toHaveLength(0)
  })

  it("should not delete a document if it doesn't fully match", async () => {
    await db.insert({ delete: 'this' })
    await db.delete({ delete: 'this', but: 'not that' })
    expect(db.findMany({ delete: 'this' })).toHaveLength(1)
  })

  it('should delete a specified number of sorted documents', async () => {
    await Promise.all([
      db.insert({ value: 3 }),
      db.insert({ value: 2 }),
      db.insert({ value: 4 }),
      db.insert({ value: 1 }),
      db.insert({ value: 5 }),
    ])
    await db.delete({}, { sort: [{ value: 'desc' }], limit: 3 })
    expect(db.findMany({})).toEqual([{ value: 2 }, { value: 1 }])
  })

  it('should clear the database', async () => {
    db = await createDocumentDatabase({
      dirPath: DIR_PATH,
      indexedFields: ['name'],
    })
    await Promise.all([
      db.insert({ name: 'one', value: 1 }),
      db.insert({ name: 'two', value: 2 }),
      db.insert({ name: 'three', value: 3 }),
    ])
    expect(db.size).toEqual(3)
    expect(db.findOne({ name: 'one' })).toEqual({ name: 'one', value: 1 })
    await db.clear()
    expect(db.size).toEqual(0)
    expect(db.findOne({ name: 'one' })).toBeUndefined()
    await db.insert({ name: 'one', value: 4 })
    expect(db.size).toEqual(1)
    expect(db.findMany({ name: 'one' })).toEqual([{ name: 'one', value: 4 }])
  })

  it('should work with journal turned off', async () => {
    db = await createDocumentDatabase({
      dirPath: DIR_PATH,
      journal: false,
    })
    await Promise.all([
      db.insert({ key1: 'value1' }),
      db.insert({ key2: 'value2' }),
      db.insert({ key3: 'value3' }),
    ])
    expect(db.findMany({})).toEqual([
      { key1: 'value1' },
      { key2: 'value2' },
      { key3: 'value3' },
    ])
  })

  it('should throw an error when the maximum number of documents is reached', async () => {
    db = await createDocumentDatabase({
      dirPath: DIR_PATH,
      maxDocuments: 3,
    })
    await Promise.all([
      db.insert({ name: 'one', value: 1 }),
      db.insert({ name: 'two', value: 2 }),
      db.insert({ name: 'three', value: 3 }),
    ])
    await expect(db.insert({ name: 'four', value: 4 })).rejects.toThrow(
      new Error('Maximum number of documents exceeded'),
    )
  })

  it('should persist documents from a previous instance', async () => {
    db = await createDocumentDatabase({
      dirPath: DIR_PATH,
      journal: { maxLines: 20 },
    })
    await Promise.all(generate(30, async (n) => db.insert({ number: n + 1 })))

    db = await createDocumentDatabase({
      dirPath: DIR_PATH,
    })
    expect(db.size).toEqual(30)
    expect(db.findMany({})).toHaveLength(30)
  })

  it('should persist documents across multiple instances', async () => {
    for (let i = 0; i < 10_000; i++) {
      // randomly destroy and recreate the database
      if (randomBoolean(0.001)) {
        db = await createDocumentDatabase({
          dirPath: DIR_PATH,
          journal: { maxLines: randomInteger(0, 100) },
          indexedFields: ['s', 'n'],
        })
      }

      void db.insert({ s: i.toString(), n: i })
    }

    await db.onIdle()

    expect(db.size).toEqual(10_000)
    expect(db.findMany({})).toHaveLength(10_000)

    expect(db.findMany({ s: '1234', n: 1234 })).toHaveLength(1)
    expect(db.findMany({ s: '2345', n: 3456 })).toHaveLength(0)
  })

  it('should correctly maintain an index', async () => {
    db = await createDocumentDatabase({
      dirPath: DIR_PATH,
      indexedFields: ['s', 'n'],
    })

    await db.insert({ s: '1', n: 1 })
    await db.insert({ s: '2', n: 2 })
    await db.insert({ s: '3', n: 3 })
    expect(db.findMany({ s: '1' })).toHaveLength(1)
    expect(db.findMany({ n: 1 })).toHaveLength(1)

    await db.update({ s: '1' }, { n: 2 })
    expect(db.findMany({ s: '1' })).toHaveLength(1)
    expect(db.findMany({ n: 1 })).toHaveLength(0)
    expect(db.findMany({ n: 2 })).toHaveLength(2)

    await db.update({ s: '2' }, { n: 3 })
    expect(db.findMany({ s: '2' })).toHaveLength(1)
    expect(db.findMany({ n: 3 })).toHaveLength(2)

    await db.delete({ n: 3 })
    expect(db.findMany({ n: 3 })).toHaveLength(0)
    expect(db.size).toEqual(1)
    expect(db.findMany({})).toEqual([{ s: '1', n: 2 }])
  })

  it('should behave the same whether indexed or not indexed', async () => {
    const sequence = []
    for (let i = 0; i < 10_000; i++) {
      const s = randomInteger(0, 10).toString()
      const n = randomInteger(0, 10)
      const r = Math.random()

      if (r < 0.4) {
        sequence.push(async (dbInstance: DocumentDatabase<Document>) =>
          dbInstance.insert({ s, n }),
        )
      } else if (r < 0.8) {
        const s1 = randomInteger(0, 10).toString()
        const n1 = randomInteger(0, 10)
        sequence.push(async (dbInstance: DocumentDatabase<Document>) =>
          dbInstance.update({ s, n }, { s: s1, n: n1 }),
        )
      } else {
        sequence.push(async (dbInstance: DocumentDatabase<Document>) =>
          dbInstance.delete({ s, n }),
        )
      }
    }

    for (const operation of sequence) {
      // randomly destroy and recreate the database
      if (randomBoolean(0.001)) {
        db = await createDocumentDatabase({
          dirPath: DIR_PATH,
          journal: { maxLines: randomInteger(0, 100) },
        })
      }

      void operation(db)
    }

    await db.onIdle()

    const snapshot = db.findMany({})
    const snapshotSize = db.size
    expect(snapshot.length).toEqual(snapshotSize)
    // not guaranteed but almost
    expect(snapshotSize).toBeGreaterThan(0)

    await db.delete({})
    expect(db.size).toEqual(0)

    db = await createDocumentDatabase({
      dirPath: DIR_PATH,
      journal: { maxLines: randomInteger(0, 100) },
      indexedFields: ['s', 'n'],
    })

    for (const operation of sequence) {
      // randomly destroy and recreate the database
      if (randomBoolean(0.001)) {
        const indexedFields = []
        if (randomBoolean(0.6)) {
          indexedFields.push('s')
        }
        if (randomBoolean(0.6)) {
          indexedFields.push('n')
        }
        db = await createDocumentDatabase({
          dirPath: DIR_PATH,
          journal: { maxLines: randomInteger(0, 100) },
          indexedFields,
        })
      }

      void operation(db)
    }

    await db.onIdle()

    expect(db.findMany({})).toEqual(snapshot)
    expect(db.size).toEqual(snapshotSize)
  })

  it('returns a cloned writable object', async () => {
    await db.insert({ key: 'value1' })
    await db.update({ key: 'value1' }, { key: 'value2' })
    const res = db.findOne({ key: 'value2' }) as Document
    expect(res).toEqual({ key: 'value2' })
    res.key = 'value3'
    expect(res).toEqual({ key: 'value3' })
    expect(db.findOne({ key: 'value2' })).toEqual({ key: 'value2' })
  })

  it('preserves __proto__ and avoids prototype pollution', async () => {
    await db.insert({ ['__proto__']: { admin: true } })

    expect(db.findMany({})).toEqual([{ ['__proto__']: { admin: true } }])
    expect('admin' in {}).toBeFalse()

    db = await createDocumentDatabase({
      dirPath: DIR_PATH,
    })

    expect(db.findMany({})).toEqual([{ ['__proto__']: { admin: true } }])
    expect('admin' in {}).toBeFalse()
  })

  it('should throw errors on invalid sort options', async () => {
    await db.insert({ key: 'value1' })
    await db.insert({ key: 'value2' })
    expect(() => db.findMany({}, { sort: [{}] })).toThrowError(
      'No keys in sort object',
    )
    expect(() =>
      db.findMany({}, { sort: [{ key1: 'asc', key2: 'desc' }] }),
    ).toThrowError('Only one key is allowed in sort object')
    expect(() =>
      db.findMany({}, { sort: [{ value: 'ascdesc' }] }),
    ).toThrowError('Invalid sort direction ascdesc')
    expect(() => db.findMany({}, { sort: [{ value: 1 }] })).toThrowError(
      'Invalid sort object',
    )
  })

  it('should have correct types', async () => {
    type Schema = {
      name: string
      stats: {
        sentMessages: number
      }
      messages: Array<{
        text: string
        deleted: boolean
      }>
    }

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const db = await createDocumentDatabase<Schema>({
      dirPath: DIR_PATH,
      // @ts-expect-error error expected as part of test
      indexedFields: ['index'],
    })

    await db.insert({
      name: 'Alice',
      stats: {
        sentMessages: 0,
        // @ts-expect-error error expected as part of test
        anotherField: 0,
      },
      messages: [
        {
          text: 'test1',
          deleted: false,
          // @ts-expect-error error expected as part of test
          anotherField: 0,
        },
        // @ts-expect-error error expected as part of test
        'anotherValue',
      ],
    })

    await db.update(
      { name: 'Alice' },
      {
        stats: {
          sentMessages: 1,
          // @ts-expect-error error expected as part of test
          anotherField: 1,
        },
        messages: [
          {
            text: 'test1',
            deleted: false,
          },
        ],
      },
    )

    await db.update(
      { messages: [{ deleted: false }] },
      // @ts-expect-error error expected as part of test
      { messages: [{ deleted: true }] },
    )

    expect(
      db.findMany(
        {},
        {
          sort: [
            { stats: { sentMessages: 'asc' } },
            // @ts-expect-error error expected as part of test
            { stats: { anotherField: 'desc' } },
          ],
          limit: 5,
        },
      ),
    ).toEqual([
      {
        name: 'Alice',
        stats: {
          sentMessages: 1,
          anotherField: 1,
        },
        messages: [
          {
            deleted: true,
          },
        ],
      },
    ])
  })
})

import fs from 'fs'
import path from 'path'
import { KeyValueDatabase, Serializable } from '../../src'
import { SerializableObject } from '../../src/types'
import { createKeyValueDatabase } from '../factory'
import { removeAllFiles, tmpDirPath } from '../utils'

const DIR_PATH = path.join(tmpDirPath, './key-value-database')

describe('KeyValueDatabase', () => {
  let db: KeyValueDatabase<Serializable>

  beforeEach(async () => {
    await removeAllFiles(DIR_PATH)

    db = await createKeyValueDatabase({
      dirPath: DIR_PATH,
    })
  })

  afterAll(async () => {
    await removeAllFiles(DIR_PATH)
    await fs.promises.rmdir(DIR_PATH)
  })

  it('should return undefined for an empty key', () => {
    expect(db.has('key')).toBeFalse()
    expect(db.get('key')).toBeUndefined()
  })

  it('should store and retrieve a string value', async () => {
    await db.set('key', 'value')
    expect(db.has('key')).toBeTrue()
    expect(db.get('key')).toEqual('value')
  })

  it('should store and retrieve an object', async () => {
    await db.set('key', { a: 1, b: 'test' })
    expect(db.get('key')).toEqual({ a: 1, b: 'test' })
  })

  it('should return keys, values and entries', async () => {
    await Promise.all([
      db.set('key1', 'value1'),
      db.set('key2', 'value2'),
      db.set('key3', 'value3'),
    ])
    expect(db.keys).toEqual(['key1', 'key2', 'key3'])
    expect(db.values).toEqual(['value1', 'value2', 'value3'])
    expect(db.entries).toEqual([
      ['key1', 'value1'],
      ['key2', 'value2'],
      ['key3', 'value3'],
    ])
  })

  it('should update an object', async () => {
    db = await createKeyValueDatabase({
      dirPath: DIR_PATH,
      journal: { maxLines: 5 },
    })
    await db.set('key', {})
    await Promise.all([
      db.update('key', { a: 1 }),
      db.update('key', { b: 2 }),
      db.update('key', { c: 3 }),
      db.update('key', { d: 4 }),
      db.update('key', { e: 5 }),
    ])
    expect(db.get('key')).toEqual({ a: 1, b: 2, c: 3, d: 4, e: 5 })
  })

  it('should delete a value', async () => {
    await db.set('key', 'value')
    expect(db.get('key')).toEqual('value')
    expect(db.size).toEqual(1)
    await db.delete('key')
    expect(db.get('key')).toBeUndefined()
    expect(db.size).toEqual(0)
  })

  it('should ignore deleting a non-existent value', async () => {
    await db.delete('key')
    expect(db.get('key')).toBeUndefined()
    expect(db.size).toEqual(0)
  })

  it('should clear the database', async () => {
    await Promise.all([
      db.set('key1', 'value1'),
      db.set('key2', 'value2'),
      db.set('key3', 'value3'),
    ])
    expect(db.size).toEqual(3)
    await db.clear()
    expect(db.size).toEqual(0)
    expect(db.get('key1')).toBeUndefined()
    await db.set('key1', 'value4')
    expect(db.size).toEqual(1)
    expect(db.get('key1')).toEqual('value4')
  })

  it('should perform an action for all keys and values', async () => {
    await Promise.all([
      db.set('key1', 'value1'),
      db.set('key2', 'value2'),
      db.set('key3', 'value3'),
    ])
    const entries: Array<[string, Serializable]> = []
    db.forEach((value, key) => {
      entries.push([key, value])
    })
    expect(entries).toEqual([
      ['key1', 'value1'],
      ['key2', 'value2'],
      ['key3', 'value3'],
    ])
  })

  it('should throw an error when the maximum number of items is reached', async () => {
    db = await createKeyValueDatabase({
      dirPath: DIR_PATH,
      maxItems: 3,
    })
    await Promise.all([
      db.set('key1', 'value1'),
      db.set('key2', 'value2'),
      db.set('key3', 'value3'),
    ])
    await expect(db.set('key4', 'value4')).rejects.toThrow(
      new Error('Maximum number of items exceeded'),
    )
    // should not reject because it's not a new item
    await db.set('key1', 'value5')
    expect(db.get('key1')).toEqual('value5')
  })

  it('should persist a value from a previous instance', async () => {
    db = await createKeyValueDatabase({
      dirPath: DIR_PATH,
      fileName: 'preserved',
    })
    expect(db.get('preserved-key')).toBeUndefined()
    await db.set('preserved-key', { name: 'Preserved Document' })
    await db.update('preserved-key', { value: 'some value' })

    db = await createKeyValueDatabase({
      dirPath: DIR_PATH,
      fileName: 'preserved',
    })
    expect(db.size).toEqual(1)
    expect(db.get('preserved-key')).toEqual({
      name: 'Preserved Document',
      value: 'some value',
    })

    await db.delete('preserved-key')

    db = await createKeyValueDatabase({
      dirPath: DIR_PATH,
      fileName: 'preserved',
    })

    expect(db.size).toEqual(0)
    expect(db.get('preserved-key')).toBeUndefined()
  })

  it('returns a cloned writable object', async () => {
    await db.set('key', { a: 1 })
    await db.update('key', { a: 2 })
    const res = db.get('key') as SerializableObject
    expect(res).toEqual({ a: 2 })
    res.a = 3
    expect(res).toEqual({ a: 3 })
    expect(db.get('key')).toEqual({ a: 2 })
  })

  it('preserves __proto__ and avoids prototype pollution', async () => {
    await db.set('__proto__', { admin: true })

    expect(db.get('__proto__')).toEqual({ admin: true })
    expect(db.get('admin')).toBeUndefined()
    expect(db.keys).toEqual(['__proto__'])
    expect('admin' in {}).toBeFalse()

    db = await createKeyValueDatabase({
      dirPath: DIR_PATH,
    })

    expect(db.get('__proto__')).toEqual({ admin: true })
    expect(db.get('admin')).toBeUndefined()
    expect(db.keys).toEqual(['__proto__'])
    expect('admin' in {}).toBeFalse()
  })
})

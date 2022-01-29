import fs from 'fs'
import path from 'path'
import { Serializable } from '../../src'
import { createSingleValue } from '../factory'
import { generate, removeAllFiles, tmpDirPath } from '../utils'

const DIR_PATH = path.join(tmpDirPath, './single-value')

describe('SingleValue', () => {
  beforeEach(async () => {
    await removeAllFiles(DIR_PATH)
  })

  afterAll(async () => {
    await removeAllFiles(DIR_PATH)
    await fs.promises.rmdir(DIR_PATH)
  })

  it('should return the default value', async () => {
    const db = await createSingleValue({
      dirPath: DIR_PATH,
      defaultValue: 'nothing',
    })
    expect(db.value).toEqual('nothing')
  })

  it('should store and retrieve a string value', async () => {
    const db = await createSingleValue<string>({
      dirPath: DIR_PATH,
      defaultValue: 'first',
    })
    await db.set('second')
    expect(db.value).toEqual('second')
  })

  it('should update an object', async () => {
    const db = await createSingleValue<Serializable>({
      dirPath: DIR_PATH,
      defaultValue: { key1: 'value1' },
    })
    await db.update({ key2: 'value2' })
    expect(db.value).toEqual({ key1: 'value1', key2: 'value2' })
  })

  it('should retrieve the last stored value', async () => {
    const db = await createSingleValue<string>({
      dirPath: DIR_PATH,
      defaultValue: '0',
    })
    await Promise.all(generate(20, async (n) => db.set(`${n + 1}`)))
    expect(db.value).toEqual('20')
  })

  it('should correctly initialize from an update file', async () => {
    let db = await createSingleValue<string>({
      dirPath: DIR_PATH,
      fileName: 'init',
      defaultValue: 'first',
    })

    await db.update('second')
    await db.close()

    await fs.promises.rename(
      path.join(DIR_PATH, 'init.json'),
      path.join(DIR_PATH, 'init.update.json'),
    )

    db = await createSingleValue<string>({
      dirPath: DIR_PATH,
      fileName: 'init',
      defaultValue: 'third',
    })

    expect(db.value).toEqual('second')
  })

  it('does not allow infinitely deep objects', async () => {
    const db = await createSingleValue<Serializable>({
      dirPath: DIR_PATH,
      defaultValue: 'first',
    })
    const object: Serializable = {}
    object.o = object

    await expect(db.set(object)).toReject()

    expect(db.value).toEqual('first')
  })

  it('does not allow infinitely deep arrays', async () => {
    const db = await createSingleValue<Serializable>({
      dirPath: DIR_PATH,
      defaultValue: 'first',
    })
    const array: Serializable = []
    array.push(array)

    await expect(db.set(array)).toReject()

    expect(db.value).toEqual('first')
  })
})

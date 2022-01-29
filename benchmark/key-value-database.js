const assert = require('assert')
// eslint-disable-next-line @typescript-eslint/naming-convention
const { KeyValueDatabase } = require('..')
const { tmpDirPath, cleanup, benchmark } = require('./benchmark-utils')

const run = async () => {
  console.log('Running KeyValueDatabase benchmark.')

  await benchmark('Load empty database', 5000, () => {
    new KeyValueDatabase({ dirPath: tmpDirPath })
  })

  let db = new KeyValueDatabase({ dirPath: tmpDirPath })

  await benchmark('Read empty database', 20 * 1000000, (index) => {
    db.get(index.toString())
  })

  await benchmark('Create documents', 5000, async (index) => {
    await db.set(index.toString(), { name: `Name #${index + 1}`, index })
  })

  await db.close()

  await benchmark('Load database with data', 1000, () => {
    new KeyValueDatabase({ dirPath: tmpDirPath })
  })

  await db.close()

  db = new KeyValueDatabase({ dirPath: tmpDirPath })

  assert.equal(db.size, 5000)

  await benchmark('Update documents', 3000, async (index) => {
    await db.update(index.toString(), { updated: true })
  })

  await benchmark('Read documents', 20 * 1000000, (index) => {
    db.get((index % 10000).toString())
  })

  await benchmark('Delete documents', 5000, async (index) => {
    await db.delete(index.toString())
  })

  assert.equal(db.size, 0)

  await db.close()
}

module.exports = run

if (!module.parent) {
  void cleanup().then(run).then(cleanup)
}

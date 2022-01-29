const assert = require('assert')
// eslint-disable-next-line @typescript-eslint/naming-convention
const { DocumentDatabase } = require('..')
const { tmpDirPath, cleanup, benchmark } = require('./benchmark-utils')

const run = async () => {
  console.log('Running DocumentDatabase benchmark.')

  await benchmark('Load empty database', 5000, () => {
    new DocumentDatabase({ dirPath: tmpDirPath })
  })

  let db = new DocumentDatabase({ dirPath: tmpDirPath })

  await benchmark('Search empty database', 20 * 1000000, () => {
    db.findMany({})
  })

  await benchmark('Insert documents', 5000, async (index) => {
    await db.insert({ name: `Name #${index + 1}`, index })
  })

  await benchmark('Find non-indexed documents', 20000, (index) => {
    db.findMany({ index: index % 10000 })
  })

  await db.close()

  await benchmark('Load database with data', 1000, () => {
    new DocumentDatabase({ dirPath: tmpDirPath })
  })

  await db.close()

  db = new DocumentDatabase({
    dirPath: tmpDirPath,
    indexedFields: ['index'],
  })

  assert.equal(db.size, 5000)

  await benchmark('Update documents', 3000, async (index) => {
    await db.update({ index }, { updated: true })
  })

  await benchmark('Find indexed documents', 1000000, (index) => {
    db.findMany({ index: index % 10000 })
  })

  await benchmark('Delete documents', 5000, async (index) => {
    await db.delete({ index })
  })

  assert.equal(db.size, 0)

  await db.close()
}

module.exports = run

if (!module.parent) {
  void cleanup().then(run).then(cleanup)
}

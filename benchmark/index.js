const { cleanup } = require('./benchmark-utils')
const documentDatabaseBenchmark = require('./document-database')
const keyValueDatabaseBenchmark = require('./key-value-database')

void cleanup()
  .then(documentDatabaseBenchmark)
  .then(cleanup)
  .then(keyValueDatabaseBenchmark)
  .then(cleanup)

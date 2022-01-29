import {
  Document,
  DocumentDatabase,
  DocumentDatabaseOptions,
  KeyValueDatabase,
  KeyValueDatabaseOptions,
  Serializable,
  SingleValue,
  SingleValueOptions,
} from '../src'

let singleValue: SingleValue<any> | undefined
let keyValueDatabase: KeyValueDatabase<any> | undefined
let documentDatabase: DocumentDatabase<any> | undefined

afterEach(async () =>
  Promise.all([
    singleValue?.close(),
    keyValueDatabase?.close(),
    documentDatabase?.close(),
  ]),
)

export const createSingleValue = async <T extends Serializable = Serializable>(
  options: SingleValueOptions<T>,
): Promise<SingleValue<T>> => {
  await singleValue?.close()
  singleValue = new SingleValue(options)
  return singleValue
}

export const createKeyValueDatabase = async <
  T extends Serializable = Serializable,
>(
  options: KeyValueDatabaseOptions,
): Promise<KeyValueDatabase<T>> => {
  await keyValueDatabase?.close()
  keyValueDatabase = new KeyValueDatabase(options)
  return keyValueDatabase
}

export const createDocumentDatabase = async <T extends Document = Document>(
  options: DocumentDatabaseOptions<T>,
): Promise<DocumentDatabase<T>> => {
  await documentDatabase?.close()
  documentDatabase = new DocumentDatabase(options)
  return documentDatabase
}

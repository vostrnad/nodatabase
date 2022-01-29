# nodatabase

A collection of persistent in-memory database-like utilities.

Useful for prototyping or hobby projects when you need persistent storage but
don't want to rely on an external database. As the name suggests, this is not an
actual database and you should always use one in anything more than a hobby
project.

## How It Works

All your data is kept in memory and continuously persisted as a single JSON
file. This limits the types you can store to `string`, `number`, `boolean` and
`null`, as well as objects and arrays containing these. Depending on your
configuration, an additional file is used as a transaction journal to improve
performance.

## Install

Using npm:

```
npm install nodatabase
```

Using Yarn:

```
yarn add nodatabase
```

## Usage

### SingleValue

```ts
import { SingleValue } from 'nodatabase'

const message = new SingleValue({
  dirPath: './data',
  fileName: 'message',
  defaultValue: '',
})

await message.set('Hello, World!')

console.log(message.value)
// => Hello, World!
```

### KeyValueDatabase

```ts
import { KeyValueDatabase } from 'nodatabase'

const users = new KeyValueDatabase({
  dirPath: './data',
  fileName: 'users',
})

await users.set('john', { name: 'John', age: 31 })

await users.update('john', { age: 32 })

console.log(users.get('john'))
// => { name: 'John', age: 32 }
```

### DocumentDatabase

```ts
import { DocumentDatabase } from 'nodatabase'

const messages = new DocumentDatabase({
  dirPath: './data',
  fileName: 'messages',
})

await messages.insert({ user: 'alice', text: 'hello' })
await messages.insert({ user: 'bob', text: 'hi' })
await messages.insert({ user: 'bob', text: 'how are you?' })

await messages.update({ user: 'bob' }, { text: null })

console.log(users.findMany({ user: 'bob' }))
// => [{ user: 'bob', text: null }, { user: 'bob', text: null }]
```

## API

### SingleValue

#### Options

```ts
type SingleValueOptions<T> = {
  /**
   * The default value to use if no stored value is found.
   */
  defaultValue: T
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
}
```

#### `.value`

A getter that returns the stored value.

#### `.set(value)`

Replaces the stored value with a new value.

#### `.update(update)`

Updates the stored value by deeply merging it with the given update. If the
value stored is not an object this has the same effect as calling `set`.

### KeyValueDatabase

#### Options

```ts
type KeyValueDatabaseOptions = {
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
```

#### `.size`

A getter that returns the number of stored values.

#### `.keys`

A getter than returns an array of all existing keys.

#### `.values`

A getter that returns an array of all stored values.

#### `.has(key)`

Returns true if the given key exists in the database, false otherwise.

#### `.get(key)`

Returns the value stored at the given key. Returns undefined if the key does not
hold a value.

#### `.forEach(callbackfn)`

Performs the specified action for each key-value pair in the database.

#### `.set(key, value)`

Stores the given value at the given key. If there already exists a value at this
key it is overwritten.

#### `.update(key, update)`

Updates the value at the given key by deeply merging it with the given update.
If the value stored is not an object this has the same effect as calling `set`.

#### `.delete(key)`

Deletes the value at the given key.

#### `.clear()`

Deletes all values in the database.

### DocumentDatabase

#### Options

```ts
type DocumentDatabaseOptions<T extends Document> = {
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
```

#### `.size`

A getter that returns the number of stored documents.

#### `.findOne(query)`

Finds and returns the first document that matches the query. Returns undefined
if no documents match.

#### `.findMany(query)`

Returns an array of documents that match the query.

#### `.insert(document)`

Inserts a new document into the database.

#### `.update(query, update)`

Updates all database documents that match the query.

#### `.delete(query)`

Deletes all database documents that match the query.

#### `.clear()`

Deletes all documents in the database.

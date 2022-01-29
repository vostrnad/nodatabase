import {
  PartialDeepObjects,
  PartialSerializable,
  Serializable,
  SerializableObject,
} from '../types'

export const partialEqual = (
  object: Serializable | undefined,
  query: PartialSerializable | undefined,
): boolean => {
  if (object === query) {
    return true
  }

  if (!object || !query) {
    return false
  }

  if (typeof object !== 'object' || typeof query !== 'object') {
    return false
  }

  if (Array.isArray(object)) {
    if (!Array.isArray(query)) {
      return false
    }

    if (object.length !== query.length) {
      return false
    }

    return object.every((item, index) => partialEqual(item, query[index]))
  }

  if (Array.isArray(query)) {
    return false
  }

  return Object.keys(query).every((key) => {
    return partialEqual(object[key], query[key])
  })
}

export const deepClone = <T extends Serializable>(object: T): T => {
  if (typeof object !== 'object' || object === null) {
    return object
  }

  if (Array.isArray(object)) {
    // @ts-expect-error ignore type error about subtype
    return object.map(deepClone)
  }

  // @ts-expect-error ignore type error about subtype
  return mapObject(object, deepClone)
}

const isSerializableObject = (
  object: Serializable,
): object is SerializableObject => {
  return typeof object === 'object' && object !== null && !Array.isArray(object)
}

export const merge = <T extends SerializableObject>(
  object: T,
  source: PartialDeepObjects<T>,
): void => {
  mapObject(source, (value, key: keyof T) => {
    const objectKeyRef = object[key]
    const sourceKeyRef = value as T[typeof key]

    if (
      isSerializableObject(objectKeyRef) &&
      isSerializableObject(sourceKeyRef)
    ) {
      merge(objectKeyRef, sourceKeyRef)
    } else {
      object[key] = deepClone(sourceKeyRef)
    }
  })
}

const mapObject = <
  T extends Record<string, unknown>,
  P extends Record<string & keyof T, unknown>,
>(
  object: T,
  callbackfn: <K extends string & keyof T>(value: T[K], key: K) => P[K],
): P => {
  const newObject = {} as P

  Object.keys(object).forEach((key: string & keyof T) => {
    newObject[key] = callbackfn(object[key], key)
  })

  return newObject
}

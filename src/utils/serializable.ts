import { PartialDeepObjects, Serializable, SerializableObject } from '../types'

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
export type PartialDeepObjects<T> = Serializable extends T
  ? Serializable
  : SerializableObject extends T
  ? PartialSerializableObject
  : T extends unknown[]
  ? T
  : T extends Record<never, unknown>
  ? { [P in keyof T]?: PartialDeepObjects<T[P]> }
  : T

export type Serializable =
  | string
  | number
  | boolean
  | null
  | Serializable[]
  | { [x: string]: Serializable }

export type SerializableObject = { [x: string]: Serializable }

export type PartialSerializable =
  | string
  | number
  | boolean
  | null
  | PartialSerializable[]
  | { [x: string]: PartialSerializable | undefined }

export type PartialSerializableObject = {
  [x: string]: PartialSerializable | undefined
}

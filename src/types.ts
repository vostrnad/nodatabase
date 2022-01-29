export type Serializable =
  | string
  | number
  | boolean
  | null
  | Serializable[]
  | { [x: string]: Serializable }

export type PartialSerializable =
  | string
  | number
  | boolean
  | null
  | PartialSerializable[]
  | { [x: string]: PartialSerializable | undefined }

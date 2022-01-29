export const hasKey = <K extends string>(
  obj: object,
  key: K,
): obj is { [key in K]: unknown } => {
  return key in obj
}

export const hasStringAtKey = <K extends string>(
  obj: object,
  key: K,
): obj is { [key in K]: string } => {
  return hasKey(obj, key) && typeof obj[key] === 'string'
}

export const hasAnyOfAtKey = <T, K extends string>(
  obj: object,
  key: K,
  values: T[] | readonly T[],
): obj is { [key in K]: T } => {
  return hasKey(obj, key) && values.includes(obj[key] as T)
}

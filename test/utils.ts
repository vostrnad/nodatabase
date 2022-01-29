import fs from 'fs'
import path from 'path'
import { Serializable } from '../src/types'

export const tmpDirPath = path.join(__dirname, './tmp')

export const randomBoolean = (p: number): boolean => {
  return Math.random() < p
}

export const randomInteger = (min: number, max: number): number => {
  return min + Math.floor(Math.random() * (max - min))
}

const randomChoice = <T>(array: ArrayLike<T>): T => {
  return array[Math.floor(Math.random() * array.length)]
}

const getRandomString = (length: number) => {
  let str = ''
  for (let i = 0; i < length; i++) {
    str += randomChoice('0123456789abcdef')
  }
  return str
}

export const getRandomSerializable = (depth: number): Serializable => {
  if (depth <= 0 || randomBoolean(1 / (1 + depth))) {
    const r = Math.random()
    if (r < 0.25) {
      return getRandomString(randomInteger(0, 16))
    } else if (r < 0.5) {
      return randomInteger(-1000, 1000)
    } else if (r < 0.75) {
      return randomBoolean(0.5)
    } else return null
  } else {
    if (randomBoolean(0.5)) {
      const array = []
      for (let i = 0; i < randomInteger(0, 1 + 20 / depth); i++) {
        array.push(getRandomSerializable(depth - 1))
      }
      return array
    } else {
      const object: Record<string, Serializable> = {}
      for (let i = 0; i < randomInteger(0, 1 + 20 / depth); i++) {
        object[getRandomString(2)] = getRandomSerializable(depth - 1)
      }
      return object
    }
  }
}

export const generate = <T>(n: number, factory: (index: number) => T): T[] => {
  const array: T[] = []
  for (let i = 0; i < n; i++) {
    array.push(factory(i))
  }
  return array
}

export const removeAllFiles = async (dirPath: string): Promise<void> => {
  let files: string[]

  try {
    files = await fs.promises.readdir(dirPath)
  } catch {
    return
  }

  for (const fileName of files) {
    await fs.promises.unlink(path.join(dirPath, fileName))
  }
}

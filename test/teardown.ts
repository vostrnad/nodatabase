import fs from 'fs'
import { tmpDirPath } from './utils'

export default async (): Promise<void> => {
  try {
    await fs.promises.rmdir(tmpDirPath)
  } catch {
    // directory missing
  }
}

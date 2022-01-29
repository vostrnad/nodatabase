const fs = require('fs')
const path = require('path')

const tmpDirPath = path.join(__dirname, './tmp')

const cleanup = async () => {
  let files

  try {
    files = await fs.promises.readdir(tmpDirPath)
  } catch {
    return
  }

  for (const fileName of files) {
    await fs.promises.unlink(path.join(tmpDirPath, fileName))
  }

  await fs.promises.rmdir(tmpDirPath)
}

/**
 * @param {string} description
 * @param {number} iterations
 * @param {(index: number) => Promise<void>} fn
 */
const benchmark = async (description, iterations, fn) => {
  const start = Date.now()

  for (let i = 0; i < iterations; i++) {
    await fn(i)
  }

  const end = Date.now()

  const averageMs = (end - start) / iterations

  console.log(` - ${description}: ${formatOps(1000 / averageMs)} op/s`)
}

/**
 * @param {number} n
 */
const formatOps = (n) => {
  // eslint-disable-next-line unicorn/no-unsafe-regex
  return n.toFixed(0).replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',')
}

module.exports = {
  tmpDirPath,
  cleanup,
  benchmark,
}

import { AsyncQueue } from '../../src/utils/async-queue'
import { generate, randomBoolean } from '../utils'

const sleep = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

describe('AsyncQueue', () => {
  it('should run operations one at a time and in order', async () => {
    const queue = new AsyncQueue()

    let executing = 0
    const source = generate(50, (index) => index)
    const target: number[] = []

    for (const item of source) {
      const promise = queue.add(async (resolve) => {
        expect(executing).toEqual(0)
        executing++

        // randomly resolve in the middle of operation
        if (randomBoolean(0.5)) resolve()

        const rand = randomBoolean(0.5)
        if (rand) target.push(item)

        await sleep(1)

        if (!rand) target.push(item)

        expect(executing).toEqual(1)
        executing--
      })

      // randomly await before adding another queue item
      if (randomBoolean(0.5)) {
        await promise
      }
    }

    await queue.onIdle()

    expect(executing).toEqual(0)
    expect(target).toEqual(source)
  })

  it('should resolve when resolve is called', async () => {
    const queue = new AsyncQueue()

    let value = 0

    await queue.add(async (resolve) => {
      value = 1
      resolve()
      await sleep(100)
      value = 2
    })

    expect(value).toEqual(1)
  })

  it('should reject when reject is called', async () => {
    const queue = new AsyncQueue()

    await expect(
      queue.add((_, reject) => {
        reject(new Error('Test error'))
      }),
    ).toReject()
  })

  it('should reject when an error is thrown', async () => {
    const queue = new AsyncQueue()

    await expect(
      queue.add(() => {
        throw new Error('Test error')
      }),
    ).toReject()
  })
})

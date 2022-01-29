import { CircularBuffer } from '../../src/utils/circular-buffer'
import { randomBoolean } from '../utils'

describe('CircularBuffer', () => {
  it('pushes and pops an element', () => {
    const queue = new CircularBuffer()

    expect(queue.length).toEqual(0)
    queue.push({ value: 'test' })
    expect(queue.length).toEqual(1)
    expect(queue.pop()).toEqual({ value: 'test' })
    expect(queue.length).toEqual(0)
  })

  it('correctly handles a large workload', () => {
    const queue = new CircularBuffer<number>({ initialSize: 1 })

    const source: number[] = []
    for (let i = 0; i < 100_000; i++) {
      source.push(Math.random())
    }

    // copy all elements from source through queue into target
    const target: number[] = []
    let index = 0
    while (target.length < source.length) {
      const doPop = randomBoolean(0.2)
      if (queue.length > 0 && (doPop || index >= source.length)) {
        target.push(queue.pop() ?? -1)
      } else {
        queue.push(source[index++])
      }
    }

    expect(source).toEqual(target)
    expect(queue.length).toEqual(0)
  })
})

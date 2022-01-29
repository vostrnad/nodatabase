import { Serializable } from '../../src'
import { deepClone, merge, partialEqual } from '../../src/utils/serializable'
import { getRandomSerializable } from '../utils'

describe('Serializable', () => {
  describe('partialEqual', () => {
    it('should pass with equal objects', () => {
      expect(partialEqual('test', 'test')).toBeTrue()
      expect(partialEqual(123, 123)).toBeTrue()
      expect(partialEqual(null, null)).toBeTrue()
      expect(partialEqual({}, {})).toBeTrue()
      expect(partialEqual({ key: 'value' }, { key: 'value' })).toBeTrue()
      expect(
        partialEqual({ a: { b: { c: 'test' } } }, { a: { b: { c: 'test' } } }),
      ).toBeTrue()
      expect(
        partialEqual({ a: 'b', c: { d: ['e'] } }, { a: 'b', c: { d: ['e'] } }),
      ).toBeTrue()
      expect(
        partialEqual([1, 2, 'a', { b: 'c' }], [1, 2, 'a', { b: 'c' }]),
      ).toBeTrue()
    })

    it('should pass with partially equal objects', () => {
      expect(partialEqual({ a: 1, b: 2 }, {})).toBeTrue()
      expect(partialEqual({ a: ['b'], c: 5 }, { a: ['b'] })).toBeTrue()
      expect(partialEqual({ a: null, b: 2 }, { a: null })).toBeTrue()
      expect(
        partialEqual(
          { a: { b: { c: 'd', e: 'f' } }, g: 'h', f: null },
          { a: { b: { c: 'd' } }, f: null },
        ),
      ).toBeTrue()
    })

    it('should pass with equal randomly created objects', () => {
      for (let i = 0; i <= 1000; i++) {
        const obj = getRandomSerializable(5)
        const clone = deepClone(obj)
        expect(partialEqual(obj, clone)).toBeTrue()
      }
    })

    it('should reject unequal objects', () => {
      expect(partialEqual('one', 'two')).toBeFalse()
      expect(partialEqual('', 0)).toBeFalse()
      expect(partialEqual([], '')).toBeFalse()
      expect(partialEqual('', [])).toBeFalse()
      expect(partialEqual([], {})).toBeFalse()
      expect(partialEqual({}, [])).toBeFalse()
      expect(partialEqual([[]], [])).toBeFalse()
      expect(
        partialEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } }),
      ).toBeFalse()
    })
  })

  describe('deepClone', () => {
    it('should copy primitive values', () => {
      expect(deepClone(null)).toBeNull()
      expect(deepClone('some string')).toEqual('some string')
      expect(deepClone(123)).toEqual(123)
    })

    it('should create new equal objects', () => {
      const testObject = (obj: Serializable) => {
        const clone = deepClone(obj)
        expect(clone).toEqual(obj)
        expect(clone).not.toBe(obj)
      }

      testObject({})
      testObject({ a: 1 })
      testObject({ a: { b: { c: 1 } } })
      testObject({ a: 1, b: 'test', c: [2, { d: 3 }] })
      testObject([])
      testObject([[[[[]]]]])
      testObject([1, 'test', { a: 2 }])
      testObject([{ a: [{ b: [{ c: 1 }] }] }])
    })

    it('should clone randomly created objects', () => {
      for (let i = 0; i <= 1000; i++) {
        const obj = getRandomSerializable(5)
        const clone = deepClone(obj)
        expect(clone).toEqual(obj)
      }
    })
  })

  describe('merge', () => {
    type AnyObject = Record<string, any>

    it('should merge two simple objects', () => {
      const object = { a: 1 }
      const source = { b: 2 }
      merge(object as AnyObject, source as AnyObject)

      expect(object).toEqual({ a: 1, b: 2 })
    })

    it('should overwrite properties', () => {
      const object = { key: 'value' }
      const source = { key: 'new value' }
      merge(object as AnyObject, source as AnyObject)

      expect(object).toEqual({ key: 'new value' })
    })

    it('should merge two complicated objects', () => {
      const object = {
        a: { b: { c: 'test1' }, d: 'test2', e: [{ f: 1 }, { g: 2 }] },
      }
      const source = {
        a: { d: 'test3', e: [{ h: 3 }, { i: 4 }] },
        j: { k: 5 },
      }
      merge(object as AnyObject, source as AnyObject)

      expect(object).toEqual({
        a: { b: { c: 'test1' }, d: 'test3', e: [{ h: 3 }, { i: 4 }] },
        j: { k: 5 },
      })
    })
  })
})

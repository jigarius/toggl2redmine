import {expect} from 'chai'
import {TemporaryStorage} from '../../../t2r/storage'

describe('class t2r.storage.TemporaryStorage', () => {
  it('.set() works with non-empty values', () => {
    const storage = new TemporaryStorage()

    expect(storage.set('foo', 'bar')).to.equal('bar')
    expect(storage.get('foo')).to.equal('bar')
  })

  it('.set() works with null', () => {
    const storage = new TemporaryStorage()

    storage.set('foo', 'bar')
    storage.set('foo', null)
    expect(storage.get('foo')).to.equal(undefined)
  })

  it('.set() works with undefined', () => {
    const storage = new TemporaryStorage()

    storage.set('foo', 'bar')
    storage.set('foo', undefined)
    expect(storage.get('foo')).to.equal(undefined)
  })

  it('.delete()', () => {
    const storage = new TemporaryStorage()

    storage.set('foo', 'bar')
    expect(storage.delete('foo')).to.equal('bar')
    expect(storage.get('foo')).to.equal(undefined)
  })
})

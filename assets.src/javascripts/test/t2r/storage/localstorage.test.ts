import jsdom from 'jsdom-global'
import {expect} from 'chai'
import {LocalStorage} from '../../../t2r/storage'

before(() => {
  jsdom(``, {url: 'https://localhost'});
})

after(() => {
  // Though it might look strange, this performs cleanup.
  jsdom()
})

describe('class t2r.storage.LocalStorage', () => {
  it('prefix is respected', () => {
    const storage1 = new LocalStorage('p1.')
    const storage2 = new LocalStorage('p2.')

    expect(storage1.prefix).to.equal('p1.')
    expect(storage2.prefix).to.equal('p2.')

    storage1.set('foo', 'bar')
    expect(storage1.get('foo')).to.equal('bar')
    expect(storage2.get('foo')).to.equal(undefined)
  })

  it('.set() works with non-empty values', () => {
    const storage = new LocalStorage('x.')

    expect(storage.set('foo', 'bar')).to.equal('bar')
    expect(storage.get('foo')).to.equal('bar')
  })

  it('.set() works with null', () => {
    const storage = new LocalStorage('x.')

    storage.set('foo', 'bar')
    storage.set('foo', null)
    expect(storage.get('foo')).to.equal(undefined)
  })

  it('.set() works with undefined', () => {
    const storage = new LocalStorage('x.')

    storage.set('foo', 'bar')
    storage.set('foo', undefined)
    expect(storage.get('foo')).to.equal(undefined)
  })

  it('.delete()', () => {
    const storage = new LocalStorage('x.')

    storage.set('foo', 'bar')
    expect(storage.delete('foo')).to.equal('bar')
    expect(storage.get('foo')).to.equal(undefined)
  })
})

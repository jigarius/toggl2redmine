import {expect} from 'chai'
import * as datetime from '../../../t2r/datetime'

describe('class t2r.datetime.DateTime', () => {
  it('.constructor()', () => {
    const nativeDate = new Date(2021, 12, 16)
    const dt = new datetime.DateTime(nativeDate)

    expect(dt.date).to.equal(nativeDate)
  })

  it('.fromString()', () => {
    const dt = datetime.DateTime.fromString('2021-12-16')
    expect(dt.toHTMLDate()).to.equal('2021-12-16')
  })

  it('.fromString() fails for invalid dates', () => {
    const entries = [
        '2021-13-26',
        '2021-12-a'
    ]

    for (const entry of entries) {
      expect(() => {
        datetime.DateTime.fromString(entry)
      }).to.throw(`Invalid date: ${entry}`)
    }
  })

  it('.toHTMLDateString()', () => {
    const oDate = new datetime.DateTime(new Date(2021, 11, 16))

    expect(oDate.toHTMLDate()).to.equal('2021-12-16')
  })

  it('.toISOString()', () => {
    const nativeDate = new Date(2021, 11, 16, 3, 16, 30)
    const oDate = new datetime.DateTime(nativeDate)

    expect(oDate.toISOString()).to.equal('2021-12-16T03:16:30.000Z')
  })

  it('.toISOString() with zero time', () => {
    const nativeDate = new Date(2021, 11, 16, 3, 16, 0)
    const oDate = new datetime.DateTime(nativeDate)

    expect(oDate.toISOString(true)).to.equal('2021-12-16T00:00:00.000Z')
  })
})

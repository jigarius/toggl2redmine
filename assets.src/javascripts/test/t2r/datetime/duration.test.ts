import {expect} from 'chai'
import * as datetime from '../../../t2r/datetime'

describe('class t2r.Duration', () => {
  it('.constructor()', () => {
    let dur: datetime.Duration

    // Works with numbers.
    dur = new datetime.Duration(300)
    expect(dur.seconds).to.equal(300)

    // Works with number as a string.
    dur = new datetime.Duration('300')
    expect(dur.seconds).to.equal(300)

    // Works with hh:mm.
    dur = new datetime.Duration('0:05')
    expect(dur.seconds).to.equal(300)
  })

  it('.hours getter', () => {
    let dur: datetime.Duration

    dur = new datetime.Duration(3600)
    expect(dur.hours).to.equal(1)

    dur = new datetime.Duration(5400)
    expect(dur.hours).to.equal(1)
  })

  it('.minutes getter', () => {
    let dur: datetime.Duration

    dur = new datetime.Duration(300)
    expect(dur.minutes).to.equal(5)

    dur = new datetime.Duration(90)
    expect(dur.minutes).to.equal(1)
  })

  it('.seconds getter', () => {
    const dur = new datetime.Duration(15)
    expect(dur.seconds).to.equal(15)
  })

  it('.seconds setter', () => {
    const dur = new datetime.Duration(0)
    dur.seconds = 15
    expect(dur.seconds).to.equal(15)
  })

  it('.setHHMM() works with hh:mm', () => {
    const dur: datetime.Duration = new datetime.Duration()

    dur.setHHMM('00:05')
    expect(dur.asHHMM()).to.equal('00:05')

    dur.setHHMM('1:30')
    expect(dur.asHHMM()).to.equal('01:30')
  })

  it('.setHHMM() works with hh', () => {
    const dur: datetime.Duration = new datetime.Duration()
    dur.setHHMM('2')
    expect(dur.asHHMM()).to.equal('02:00')
  })

  it('.setHHMM() works with :mm', () => {
    const dur: datetime.Duration = new datetime.Duration()

    dur.setHHMM(':5')
    expect(dur.asHHMM()).to.equal('00:05')

    dur.setHHMM(':30')
    expect(dur.asHHMM()).to.equal('00:30')
  })

  it('.setHHMM() works with hh.mm', () => {
    const dur: datetime.Duration = new datetime.Duration()

    dur.setHHMM('.5')
    expect(dur.asHHMM()).to.equal('00:30')

    dur.setHHMM('2.25')
    expect(dur.asHHMM()).to.equal('02:15')
  })

  it('.asHHMM()', () => {
    let dur: datetime.Duration

    dur = new datetime.Duration(0)
    expect(dur.asHHMM()).to.equal('00:00')

    dur = new datetime.Duration(300)
    expect(dur.asHHMM()).to.equal('00:05')

    dur = new datetime.Duration(5400)
    expect(dur.asHHMM()).to.equal('01:30')
  })

  it('.asDecimal()', () => {
    let dur: datetime.Duration

    dur = new datetime.Duration(0)
    expect(dur.asDecimal()).to.equal('0.00')

    dur = new datetime.Duration(300)
    expect(dur.asDecimal()).to.equal('0.08')

    dur = new datetime.Duration(900)
    expect(dur.asDecimal()).to.equal('0.25')

    dur = new datetime.Duration(1800)
    expect(dur.asDecimal()).to.equal('0.50')

    dur = new datetime.Duration(2700)
    expect(dur.asDecimal()).to.equal('0.75')

    dur = new datetime.Duration(3600)
    expect(dur.asDecimal()).to.equal('1.00')
  })

  it('.add()', () => {
    const dur = new datetime.Duration(300)
    dur.add(new datetime.Duration(150))
    expect(dur.seconds).to.equal(450)
  })

  it('.sub()', () => {
    const dur = new datetime.Duration(300)
    dur.sub(new datetime.Duration(150))
    expect(dur.seconds).to.equal(150)
  })

  it('.sub() does not allow negative durations', () => {
    const dur = new datetime.Duration(300)
    dur.sub(new datetime.Duration(450))
    expect(dur.seconds).to.equal(0)
  })

  it('.roundTo() can round off', () => {
    let dur: datetime.Duration

    // 5m to the nearest 5 minute.
    dur = new datetime.Duration('00:05')
    dur.roundTo(5, datetime.RoundingMethod.Regular)
    expect(dur.asHHMM()).to.equal('00:05')

    // 7m 29s to the nearest 5 minute.
    dur = new datetime.Duration(7 * 60 + 29)
    dur.roundTo(5, datetime.RoundingMethod.Regular)
    expect(dur.asHHMM()).to.equal('00:05')

    // 7m 30s to the nearest 5 minute.
    dur = new datetime.Duration(7.5 * 60)
    dur.roundTo(5, datetime.RoundingMethod.Regular)
    expect(dur.asHHMM()).to.equal('00:10')

    // 7m 31s to the nearest 5 minute.
    dur = new datetime.Duration(7 * 60 + 31)
    dur.roundTo(5, datetime.RoundingMethod.Regular)
    expect(dur.asHHMM()).to.equal('00:10')
  })

  it('.roundTo() can round up', () => {
    let dur: datetime.Duration

    // 5m to the nearest 5 minute.
    dur = new datetime.Duration('00:05')
    dur.roundTo(5, datetime.RoundingMethod.Up)
    expect(dur.asHHMM()).to.equal('00:05')

    // 7m 29s to the nearest 5 minute.
    dur = new datetime.Duration(7 * 60 + 29)
    dur.roundTo(5, datetime.RoundingMethod.Up)
    expect(dur.asHHMM()).to.equal('00:10')

    // 7m 30s to the nearest 5 minute.
    dur = new datetime.Duration(7.5 * 60)
    dur.roundTo(5, datetime.RoundingMethod.Up)
    expect(dur.asHHMM()).to.equal('00:10')

    // 7m 31s to the nearest 5 minute.
    dur = new datetime.Duration(7 * 60 + 31)
    dur.roundTo(5, datetime.RoundingMethod.Up)
    expect(dur.asHHMM()).to.equal('00:10')
  })

  it('.roundTo() can round down', () => {
    let dur: datetime.Duration

    // 5m to the nearest 5 minute.
    dur = new datetime.Duration('00:05')
    dur.roundTo(5, datetime.RoundingMethod.Down)
    expect(dur.asHHMM()).to.equal('00:05')

    // 7m 29s to the nearest 5 minute.
    dur = new datetime.Duration(7 * 60 + 29)
    dur.roundTo(5, datetime.RoundingMethod.Down)
    expect(dur.asHHMM()).to.equal('00:05')

    // 7m 30s to the nearest 5 minute.
    dur = new datetime.Duration(7.5 * 60)
    dur.roundTo(5, datetime.RoundingMethod.Down)
    expect(dur.asHHMM()).to.equal('00:05')

    // 7m 31s to the nearest 5 minute.
    dur = new datetime.Duration(7 * 60 + 31)
    dur.roundTo(5, datetime.RoundingMethod.Down)
    expect(dur.asHHMM()).to.equal('00:05')
  })
})

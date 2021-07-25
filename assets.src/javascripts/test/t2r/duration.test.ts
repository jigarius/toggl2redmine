import {expect} from 'chai'
import * as duration from '../../t2r/duration'

describe('class t2r.Duration', () => {
  it('.constructor()', () => {
    let dur: duration.Duration

    // Works with numbers.
    dur = new duration.Duration(300)
    expect(dur.seconds).to.equal(300)

    // Works with number as a string.
    dur = new duration.Duration('300')
    expect(dur.seconds).to.equal(300)

    // Works with hh:mm.
    dur = new duration.Duration('0:05')
    expect(dur.seconds).to.equal(300)
  })

  it('.hours getter', () => {
    let dur: duration.Duration

    dur = new duration.Duration(3600)
    expect(dur.hours).to.equal(1)

    dur = new duration.Duration(5400)
    expect(dur.hours).to.equal(1)
  })

  it('.minutes getter', () => {
    let dur: duration.Duration

    dur = new duration.Duration(300)
    expect(dur.minutes).to.equal(5)

    dur = new duration.Duration(90)
    expect(dur.minutes).to.equal(1)
  })

  it('.seconds getter', () => {
    const dur = new duration.Duration(15)
    expect(dur.seconds).to.equal(15)
  })

  it('.seconds setter', () => {
    const dur = new duration.Duration(0)
    dur.seconds = 15
    expect(dur.seconds).to.equal(15)
  })

  it('.setHHMM() works with hh:mm', () => {
    const dur: duration.Duration = new duration.Duration()

    dur.setHHMM('00:05')
    expect(dur.asHHMM()).to.equal('00:05')

    dur.setHHMM('1:30')
    expect(dur.asHHMM()).to.equal('01:30')
  })

  it('.setHHMM() works with hh', () => {
    const dur: duration.Duration = new duration.Duration()
    dur.setHHMM('2')
    expect(dur.asHHMM()).to.equal('02:00')
  })

  it('.setHHMM() works with :mm', () => {
    const dur: duration.Duration = new duration.Duration()

    dur.setHHMM(':5')
    expect(dur.asHHMM()).to.equal('00:05')

    dur.setHHMM(':30')
    expect(dur.asHHMM()).to.equal('00:30')
  })

  it('.setHHMM() works with hh.mm', () => {
    const dur: duration.Duration = new duration.Duration()

    dur.setHHMM('.5')
    expect(dur.asHHMM()).to.equal('00:30')

    dur.setHHMM('2.25')
    expect(dur.asHHMM()).to.equal('02:15')
  })

  it('.asHHMM()', () => {
    let dur: duration.Duration

    dur = new duration.Duration(0)
    expect(dur.asHHMM()).to.equal('00:00')

    dur = new duration.Duration(300)
    expect(dur.asHHMM()).to.equal('00:05')

    dur = new duration.Duration(5400)
    expect(dur.asHHMM()).to.equal('01:30')
  })

  it('.asDecimal()', () => {
    let dur: duration.Duration

    dur = new duration.Duration(0)
    expect(dur.asDecimal()).to.equal('0.00')

    dur = new duration.Duration(300)
    expect(dur.asDecimal()).to.equal('0.08')

    dur = new duration.Duration(900)
    expect(dur.asDecimal()).to.equal('0.25')

    dur = new duration.Duration(1800)
    expect(dur.asDecimal()).to.equal('0.50')

    dur = new duration.Duration(2700)
    expect(dur.asDecimal()).to.equal('0.75')

    dur = new duration.Duration(3600)
    expect(dur.asDecimal()).to.equal('1.00')
  })

  it('.add()', () => {
    const dur = new duration.Duration(300)
    dur.add(new duration.Duration(150))
    expect(dur.seconds).to.equal(450)
  })

  it('.sub()', () => {
    const dur = new duration.Duration(300)
    dur.sub(new duration.Duration(150))
    expect(dur.seconds).to.equal(150)
  })

  it('.sub() does not allow negative durations', () => {
    const dur = new duration.Duration(300)
    dur.sub(new duration.Duration(450))
    expect(dur.seconds).to.equal(0)
  })

  it('.roundTo() can round off', () => {
    let dur: duration.Duration

    // 5m to the nearest 5 minute.
    dur = new duration.Duration('00:05')
    dur.roundTo(5, duration.Rounding.Regular)
    expect(dur.asHHMM()).to.equal('00:05')

    // 7m 29s to the nearest 5 minute.
    dur = new duration.Duration(7 * 60 + 29)
    dur.roundTo(5, duration.Rounding.Regular)
    expect(dur.asHHMM()).to.equal('00:05')

    // 7m 30s to the nearest 5 minute.
    dur = new duration.Duration(7.5 * 60)
    dur.roundTo(5, duration.Rounding.Regular)
    expect(dur.asHHMM()).to.equal('00:10')

    // 7m 31s to the nearest 5 minute.
    dur = new duration.Duration(7 * 60 + 31)
    dur.roundTo(5, duration.Rounding.Regular)
    expect(dur.asHHMM()).to.equal('00:10')
  })

  it('.roundTo() can round up', () => {
    let dur: duration.Duration

    // 5m to the nearest 5 minute.
    dur = new duration.Duration('00:05')
    dur.roundTo(5, duration.Rounding.Up)
    expect(dur.asHHMM()).to.equal('00:05')

    // 7m 29s to the nearest 5 minute.
    dur = new duration.Duration(7 * 60 + 29)
    dur.roundTo(5, duration.Rounding.Up)
    expect(dur.asHHMM()).to.equal('00:10')

    // 7m 30s to the nearest 5 minute.
    dur = new duration.Duration(7.5 * 60)
    dur.roundTo(5, duration.Rounding.Up)
    expect(dur.asHHMM()).to.equal('00:10')

    // 7m 31s to the nearest 5 minute.
    dur = new duration.Duration(7 * 60 + 31)
    dur.roundTo(5, duration.Rounding.Up)
    expect(dur.asHHMM()).to.equal('00:10')
  })

  it('.roundTo() can round down', () => {
    let dur: duration.Duration

    // 5m to the nearest 5 minute.
    dur = new duration.Duration('00:05')
    dur.roundTo(5, duration.Rounding.Down)
    expect(dur.asHHMM()).to.equal('00:05')

    // 7m 29s to the nearest 5 minute.
    dur = new duration.Duration(7 * 60 + 29)
    dur.roundTo(5, duration.Rounding.Down)
    expect(dur.asHHMM()).to.equal('00:05')

    // 7m 30s to the nearest 5 minute.
    dur = new duration.Duration(7.5 * 60)
    dur.roundTo(5, duration.Rounding.Down)
    expect(dur.asHHMM()).to.equal('00:05')

    // 7m 31s to the nearest 5 minute.
    dur = new duration.Duration(7 * 60 + 31)
    dur.roundTo(5, duration.Rounding.Down)
    expect(dur.asHHMM()).to.equal('00:05')
  })
})

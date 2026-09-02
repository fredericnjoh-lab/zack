import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calendarDropPatch, calendarGridPeriod, isOnVisibleGrid } from './calendar.ts'

const september = new Date('2026-09-02T11:00:00.000Z')

test('grid stays on the seed/scheduled month, not the current month', () => {
  const period = calendarGridPeriod(
    [
      { day: 0, month: 9, year: 2026 },
      { day: 17, month: 8, year: 2026 },
      { day: 18, month: 8, year: 2026 },
    ],
    september,
  )
  assert.deepEqual(period, { month: 8, year: 2026 })
})

test('empty / inbox-only boards use the current month', () => {
  assert.deepEqual(calendarGridPeriod([], september), { month: 9, year: 2026 })
  assert.deepEqual(
    calendarGridPeriod([{ day: 0, month: 9, year: 2026 }], september),
    { month: 9, year: 2026 },
  )
})

test('dropping an inbox idea keeps it on the visible grid', () => {
  const period = calendarGridPeriod(
    [
      { day: 17, month: 8, year: 2026 },
      { day: 0, month: 9, year: 2026 },
    ],
    september,
  )
  const inbox = { day: 0, month: 9, year: 2026 }
  const dayOnly = { ...inbox, day: 5 }
  const patched = { ...inbox, ...calendarDropPatch(5, period) }

  assert.equal(isOnVisibleGrid(dayOnly, period), false)
  assert.equal(isOnVisibleGrid(patched, period), true)
  assert.deepEqual(calendarDropPatch(5, period), { day: 5, month: 8, year: 2026 })
})

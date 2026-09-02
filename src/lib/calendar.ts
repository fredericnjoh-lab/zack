/** Month/year the calendar grid is showing. */
export type CalendarPeriod = {
  month: number
  year: number
}

/**
 * The grid follows the first already-scheduled idea so leftover / seed
 * items stay visible. Inbox-only boards fall back to the current month.
 */
export function calendarGridPeriod(
  items: Array<{ day: number; month: number; year: number }>,
  now = new Date(),
): CalendarPeriod {
  const scheduled = items.find((item) => item.day > 0)
  return {
    month: scheduled?.month ?? now.getMonth() + 1,
    year: scheduled?.year ?? now.getFullYear(),
  }
}

/**
 * Persist the visible grid's month/year on drop.
 *
 * Inbox ideas are created with `day: 0` and the *current* month. The grid
 * may be showing an older month (seed data, last month's leftovers). A
 * day-only patch then leaves the idea on a month the grid does not render,
 * so it vanishes from both the inbox and the calendar.
 */
export function calendarDropPatch(day: number, period: CalendarPeriod): { day: number; month: number; year: number } {
  return { day, month: period.month, year: period.year }
}

/** True when a scheduled idea belongs on the visible month grid. */
export function isOnVisibleGrid(
  item: { day: number; month: number; year: number },
  period: CalendarPeriod,
): boolean {
  return item.day > 0 && item.month === period.month && item.year === period.year
}

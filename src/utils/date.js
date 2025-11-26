const ISO_YEAR = 2026

export function getIsoWeekStartDate(weekNumber) {
  const simple = new Date(Date.UTC(ISO_YEAR, 0, 4))
  const dayOfWeek = simple.getUTCDay() || 7
  const isoWeek1Start = new Date(simple)
  isoWeek1Start.setUTCDate(simple.getUTCDate() - dayOfWeek + 1)
  const target = new Date(isoWeek1Start)
  target.setUTCDate(isoWeek1Start.getUTCDate() + (weekNumber - 1) * 7)
  return target
}

export function getWeekRange(weekNumber) {
  const start = getIsoWeekStartDate(weekNumber)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)
  return { start, end }
}

export function formatRange(weekNumber) {
  const { start, end } = getWeekRange(weekNumber)
  const format = (d) => d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
  return `Week ${String(weekNumber).padStart(2, '0')} (${format(start)} - ${format(end)})`
}

export function generateWeeks() {
  return Array.from({ length: 52 }, (_, i) => i + 1)
}

export function isDateInWeek(dateStr, weekNumber) {
  if (!dateStr) return false
  const date = new Date(dateStr)
  const { start, end } = getWeekRange(Number(weekNumber))
  return date >= start && date <= end
}

export function getDateBounds(weekNumber) {
  if (!weekNumber) return {}
  const { start, end } = getWeekRange(Number(weekNumber))
  const toInput = (d) => d.toISOString().split('T')[0]
  return { min: toInput(start), max: toInput(end) }
}

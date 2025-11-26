import { useEffect, useMemo, useState } from 'react'
import { Moon, Sun, PlayCircle, Download, Mail, Plus, Calendar, User } from 'lucide-react'
import TimesheetEntryRow from './components/TimesheetEntryRow'
import { engineers } from './utils/data'
import { formatRange, generateWeeks, getDateBounds, isDateInWeek } from './utils/date'

const STORAGE_KEY = 'sirus-timesheet-v1'
const AUTO_SAVE_MS = 30000

const initialEntry = {
  date: '',
  project: '',
  scope: '',
  serviceCategory: '',
  serviceType: '',
  startTime: '',
  endTime: '',
  travelTime: '',
  comments: '',
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [showLanding, setShowLanding] = useState(() => !localStorage.getItem('started'))
  const [engineer, setEngineer] = useState(() => localStorage.getItem('engineer') || '')
  const [selectedWeek, setSelectedWeek] = useState(() => localStorage.getItem('week') || '')
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  })
  const [lastSaved, setLastSaved] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
      setLastSaved(new Date())
    }, AUTO_SAVE_MS)
    return () => clearInterval(interval)
  }, [entries])

  useEffect(() => {
    localStorage.setItem('engineer', engineer)
  }, [engineer])

  useEffect(() => {
    localStorage.setItem('week', selectedWeek)
  }, [selectedWeek])

  const addEntry = () => {
    if (!selectedWeek) return
    setEntries((prev) => [...prev, { ...initialEntry, id: crypto.randomUUID(), week: selectedWeek }])
  }

  const updateEntry = (id, updated) => {
    setEntries((prev) => prev.map((item) => (item.id === id ? updated : item)))
  }

  const duplicateEntry = (id) => {
    const target = entries.find((e) => e.id === id)
    if (target) {
      setEntries((prev) => [...prev, { ...target, id: crypto.randomUUID() }])
    }
  }

  const deleteEntry = (id) => setEntries((prev) => prev.filter((item) => item.id !== id))

  const weeks = useMemo(() => generateWeeks(), [])

  const filteredEntries = entries.filter((entry) => entry.week === selectedWeek)

  const totals = filteredEntries.reduce(
    (acc, entry) => {
      const startIdx = timeToIndex(entry.startTime)
      const endIdx = timeToIndex(entry.endTime)
      const minutes = Math.max((endIdx - startIdx) * 15, 0)
      const hours = minutes / 60 || 0
      const travel = Number(entry.travelTime || 0)
      acc.hours += hours
      acc.travel += travel
      acc.total += hours + travel
      acc.projects.add(entry.project)
      return acc
    },
    { hours: 0, travel: 0, total: 0, projects: new Set() },
  )

  const validationErrors = (entry) => {
    const errors = {}
    if (!entry.date) errors.date = 'Required'
    if (!entry.project) errors.project = 'Required'
    if (!entry.scope) errors.scope = 'Required'
    if (!entry.serviceCategory) errors.serviceCategory = 'Required'
    if (!entry.serviceType) errors.serviceType = 'Required'
    if (!entry.startTime) errors.startTime = 'Required'
    if (!entry.endTime) errors.endTime = 'Required'

    const startIdx = timeToIndex(entry.startTime)
    const endIdx = timeToIndex(entry.endTime)
    if (startIdx >= 0 && endIdx >= 0 && endIdx <= startIdx) {
      errors.endTime = 'End must be after start'
    }
    if (entry.travelTime && Number(entry.travelTime) < 0) {
      errors.travelTime = 'Must be >= 0'
    }
    if (entry.date && selectedWeek && !isDateInWeek(entry.date, selectedWeek)) {
      errors.date = 'Date must be inside the week'
    }
    return errors
  }

  const hasOverlappingEntry = (entry) => {
    if (!entry.date) return false
    const startIdx = timeToIndex(entry.startTime)
    const endIdx = timeToIndex(entry.endTime)
    return filteredEntries.some((other) => {
      if (other.id === entry.id || other.date !== entry.date) return false
      const oStart = timeToIndex(other.startTime)
      const oEnd = timeToIndex(other.endTime)
      return startIdx < oEnd && endIdx > oStart
    })
  }

  const exportCsv = () => {
    if (!engineer || !selectedWeek) return
    const headers = [
      'Week',
      'Date',
      'Project',
      'Scope',
      'Service Category',
      'Service Type',
      'Start Time',
      'End Time',
      'Hours (decimal)',
      'Travel Time',
      'Total Hours',
      'Comments',
    ]
    const rows = filteredEntries.map((entry) => {
      const startIdx = timeToIndex(entry.startTime)
      const endIdx = timeToIndex(entry.endTime)
      const hours = Math.max((endIdx - startIdx) * 15, 0) / 60
      const travel = Number(entry.travelTime || 0)
      const total = hours + travel
      return [
        `Week ${String(selectedWeek).padStart(2, '0')}`,
        entry.date,
        entry.project,
        entry.scope,
        entry.serviceCategory,
        entry.serviceType,
        entry.startTime,
        entry.endTime,
        hours.toFixed(2),
        travel.toFixed(2),
        total.toFixed(2),
        entry.comments?.replace(/\n/g, ' '),
      ]
    })

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell || ''}"`).join(','))
      .join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Timesheet_${engineer.replace(/\s+/g, '')}_Week${String(selectedWeek).padStart(2, '0')}_2026.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const emailTemplate = () => {
    if (!engineer || !selectedWeek) return { subject: '', body: '' }
    const { min, max } = getDateBounds(selectedWeek)
    const subject = `Timesheet Submission - ${engineer} - Week ${String(selectedWeek).padStart(2, '0')} - 2026`
    const body = `Dear Manager,%0D%0APlease find attached my timesheet for Week ${String(selectedWeek).padStart(2, '0')} (${formatRange(selectedWeek).split('(')[1].replace(')', '')}).%0D%0A%0D%0ASummary:%0D%0A%0D%0ATotal Hours: ${totals.total.toFixed(2)} hours%0D%0AProjects: ${Array.from(totals.projects).filter(Boolean).join(', ') || 'N/A'}%0D%0APeriod: ${min} to ${max}%0D%0AWeek: Week ${String(selectedWeek).padStart(2, '0')} of 2026%0D%0A%0D%0ABest regards,%0D%0A${engineer}`
    return { subject, body }
  }

  const copyEmail = () => {
    const { subject, body } = emailTemplate()
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${decodeURIComponent(body.replace(/%0D%0A/g, '\n'))}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const missingRequired = !engineer || !selectedWeek

  return (
    <div className="min-h-screen bg-gradient-to-b from-darkBg to-black text-gray-100 dark:from-darkBg dark:to-black">
      {showLanding ? (
        <Landing theme={theme} setTheme={setTheme} onStart={() => { setShowLanding(false); localStorage.setItem('started', '1') }} />
      ) : (
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 space-y-6">
          <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-accent">SIRUS Timesheet System</p>
              <h1 className="text-3xl font-bold text-white">MVP V1.0</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <div className="text-xs text-gray-400">
                Draft saved {lastSaved ? lastSaved.toLocaleTimeString() : '...'}
              </div>
            </div>
          </header>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="card space-y-3 lg:col-span-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-accent" />
                <h2 className="text-lg font-semibold text-white">Engineer & Week</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-gray-200">Engineer</span>
                  <select
                    value={engineer}
                    onChange={(e) => setEngineer(e.target.value)}
                    className="w-full"
                  >
                    <option value="">Select engineer</option>
                    {engineers.map((eng, idx) => (
                      <option key={eng} value={eng}>
                        {eng} (ENG_{String(idx + 1).padStart(3, '0')})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-gray-200">Week (2026)</span>
                  <div className="flex gap-2">
                    <select
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(e.target.value)}
                      className="w-full"
                    >
                      <option value="">Select week</option>
                      {weeks.map((week) => (
                        <option key={week} value={week}>
                          {formatRange(week)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-ghost"
                      aria-label="Previous week"
                      onClick={() => setSelectedWeek((prev) => Math.max(Number(prev || 1) - 1, 1).toString())}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      aria-label="Next week"
                      onClick={() => setSelectedWeek((prev) => Math.min(Number(prev || 1) + 1, 52).toString())}
                    >
                      ›
                    </button>
                  </div>
                </label>
              </div>
              {missingRequired && (
                <div className="rounded-lg border border-amber-400/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
                  Please select an engineer and week to start entering timesheets.
                </div>
              )}
            </div>

            <div className="card space-y-3">
              <div className="flex items-center gap-2 text-white">
                <Calendar className="h-4 w-4 text-accent" />
                <h3 className="font-semibold">Weekly Dashboard</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Total Hours" value={totals.total.toFixed(2)} />
                <Metric label="# Entries" value={filteredEntries.length} />
                <Metric label="Projects" value={totals.projects.size} />
                <Metric label="Travel" value={totals.travel.toFixed(2)} />
              </div>
              {selectedWeek && (
                <p className="text-xs text-gray-400">Period: {formatRange(selectedWeek)}</p>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <PlayCircle className="h-5 w-5 text-accent" />
                <h2 className="text-xl font-semibold">Timesheet Entries</h2>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={addEntry}
                disabled={!selectedWeek}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Entry
              </button>
            </div>

            <div className="space-y-3">
              {filteredEntries.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-500/40 p-6 text-center text-sm text-gray-400">
                  No entries yet. Select a week and click “Add Entry” to begin.
                </div>
              )}
              {filteredEntries.map((entry) => (
                <TimesheetEntryRow
                  key={entry.id}
                  entry={entry}
                  weekNumber={selectedWeek}
                  onChange={(updated) => updateEntry(entry.id, updated)}
                  onDuplicate={() => duplicateEntry(entry.id)}
                  onDelete={() => deleteEntry(entry.id)}
                  errors={{ ...validationErrors(entry), ...(hasOverlappingEntry(entry) ? { startTime: 'Overlapping entry' } : {}) }}
                />
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="card space-y-3">
              <div className="flex items-center gap-2 text-white">
                <Download className="h-4 w-4 text-accent" />
                <h3 className="font-semibold">Export</h3>
              </div>
              <p className="text-sm text-gray-300">Generate a CSV with decimal hour totals.</p>
              <button type="button" className="btn-primary w-fit" onClick={exportCsv} disabled={filteredEntries.length === 0}>
                Export CSV
              </button>
            </div>

            <div className="card space-y-3">
              <div className="flex items-center gap-2 text-white">
                <Mail className="h-4 w-4 text-accent" />
                <h3 className="font-semibold">Email Template</h3>
              </div>
              <p className="text-sm text-gray-300">Copy a ready-to-send subject and body or open your mail client.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={copyEmail} disabled={filteredEntries.length === 0}>
                  {copied ? 'Copied!' : 'Copy to clipboard'}
                </button>
                <a
                  className="btn-ghost border border-white/10"
                  href={`mailto:?subject=${encodeURIComponent(emailTemplate().subject)}&body=${emailTemplate().body}`}
                >
                  Open Mail client
                </a>
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  )
}

function Landing({ onStart, theme, setTheme }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-black via-darkBg to-black text-white">
      <div className="text-center space-y-6">
        <div className="mx-auto h-32 w-32 rounded-full border-2 border-accent/70 bg-accent/10 shadow-lg animate-pulse" />
        <div>
          <p className="text-accent tracking-[0.4em] text-xs uppercase">SIRUS</p>
          <h1 className="text-4xl font-black">Timesheet System</h1>
          <p className="text-sm text-gray-400">Developed By: Egydio Albanese · Version: V1.0</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button onClick={onStart} className="btn-primary px-6 py-3 text-base">
            <PlayCircle className="mr-2 h-5 w-5" /> Start Timesheet
          </button>
          <button
            type="button"
            className="btn-ghost"
            aria-label="Toggle theme"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function timeToIndex(time) {
  if (!time) return -1
  const [h, m] = time.split(':').map(Number)
  return h * 4 + m / 15
}

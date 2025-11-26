import { useEffect, useMemo, useState } from 'react'
import {
  Moon,
  Sun,
  PlayCircle,
  Download,
  Mail,
  Plus,
  Calendar,
  User,
  RotateCcw,
  Trash2,
  Check,
} from 'lucide-react'
import TimesheetEntryRow from './components/TimesheetEntryRow'
import { engineers } from './utils/data'
import { formatRange, generateWeeks, getDateBounds, isDateInWeek } from './utils/date'

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
  const [theme, setTheme] = useState('dark')
  const [screen, setScreen] = useState('landing')
  const [engineer, setEngineer] = useState('')
  const [selectedWeek, setSelectedWeek] = useState('')
  const [entries, setEntries] = useState([])
  const [copied, setCopied] = useState(false)
  const [showExportLoading, setShowExportLoading] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [toast, setToast] = useState(null)
  const [resetAnimating, setResetAnimating] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!showExportModal) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setShowExportModal(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [showExportModal])

  const weeks = useMemo(() => generateWeeks(), [])
  const filteredEntries = selectedWeek ? entries.filter((entry) => entry.week === selectedWeek) : []

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

  const emailTemplate = () => {
    if (!engineer || !selectedWeek) return { subject: '', body: '' }
    const { min, max } = getDateBounds(selectedWeek)
    const subject = `Timesheet Submission - ${engineer} - Week ${String(selectedWeek).padStart(2, '0')} - 2026`
    const body = `Dear Manager,%0D%0APlease find attached my timesheet for Week ${String(selectedWeek).padStart(2, '0')} (${formatRange(selectedWeek)
      .split('(')[1]
      .replace(')', '')}).%0D%0A%0D%0ASummary:%0D%0A%0D%0ATotal Hours: ${totals.total.toFixed(2)} hours%0D%0AProjects: ${
      Array.from(totals.projects).filter(Boolean).join(', ') || 'N/A'
    }%0D%0APeriod: ${min} to ${max}%0D%0AWeek: Week ${String(selectedWeek).padStart(2, '0')} of 2026%0D%0A%0D%0ABest regards,%0D%0A${engineer}`
    return { subject, body }
  }

  const copyEmail = () => {
    const { subject, body } = emailTemplate()
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${decodeURIComponent(body.replace(/%0D%0A/g, '\n'))}`)
    setCopied(true)
    setToast({ message: '✓ Copiado!', type: 'success' })
    setTimeout(() => setCopied(false), 2000)
  }

  const exportCsv = () => {
    if (!engineer || !selectedWeek || filteredEntries.length === 0) return
    setShowExportLoading(true)
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

    const elapsed = 800
    setTimeout(() => {
      setShowExportLoading(false)
      setShowExportModal(true)
    }, elapsed)
  }

  const closeAndReset = () => {
    setShowExportModal(false)
    setEngineer('')
    setSelectedWeek('')
    setEntries([])
    setScreen('landing')
    setCopied(false)
  }

  const handleResetAll = () => {
    if (entries.length === 0) return
    setShowResetConfirm(true)
  }

  const confirmResetAll = () => {
    setShowResetConfirm(false)
    setResetAnimating(true)
    setTimeout(() => {
      setEntries([])
      setEngineer('')
      setSelectedWeek('')
      setResetAnimating(false)
      setToast({ message: '✓ Todos os dados foram limpos.', type: 'success' })
    }, 200)
  }

  const missingRequired = !engineer || !selectedWeek
  const actionsDisabled = filteredEntries.length === 0 || !engineer || !selectedWeek

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-[#f9fafb] text-[#111827]'} transition-colors duration-300`}>
      {screen === 'landing' ? (
        <Landing theme={theme} setTheme={setTheme} onStart={() => setScreen('main')} />
      ) : (
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 space-y-6">
          <header className="flex flex-col gap-2 text-left">
            <div className="flex items-center gap-3 text-xl font-semibold sm:text-2xl">
              <span>Sirus Timesheet Builder</span>
              <span className="text-sm font-normal text-gray-500 dark:text-gray-300">Version: V1.0</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>Developed By: Egydio Albanese</span>
              <span className="text-xs">⚠️ Lembre-se de exportar seu timesheet antes de sair</span>
            </div>
            <div className="flex items-center justify-end">
              <ThemeToggle theme={theme} setTheme={setTheme} />
            </div>
          </header>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="card space-y-3 lg:col-span-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold">Engineer & Week</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Engineer</span>
                  <select value={engineer} onChange={(e) => setEngineer(e.target.value)} className="w-full">
                    <option value="">Select engineer</option>
                    {engineers.map((eng, idx) => (
                      <option key={eng} value={eng}>
                        {eng} (ENG_{String(idx + 1).padStart(3, '0')})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Week (2026)</span>
                  <div className="flex gap-2">
                    <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} className="w-full">
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
                      onClick={() =>
                        setSelectedWeek((prev) => {
                          const next = Math.max(Number(prev || 1) - 1, 1)
                          return String(next)
                        })
                      }
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      aria-label="Next week"
                      onClick={() =>
                        setSelectedWeek((prev) => {
                          const next = Math.min(Number(prev || 1) + 1, 52)
                          return String(next)
                        })
                      }
                    >
                      ›
                    </button>
                  </div>
                </label>
              </div>
              {missingRequired && (
                <div className="rounded-lg border border-amber-400/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 dark:text-amber-100">
                  Please select an engineer and week to start entering timesheets.
                </div>
              )}
            </div>

            <div className="card space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Weekly Dashboard</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Total Hours" value={totals.total.toFixed(2)} />
                <Metric label="# Entries" value={filteredEntries.length} />
                <Metric label="Projects" value={totals.projects.size} />
                <Metric label="Travel" value={totals.travel.toFixed(2)} />
              </div>
              {selectedWeek && <p className="text-xs text-gray-600 dark:text-gray-400">Period: {formatRange(selectedWeek)}</p>}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <PlayCircle className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Timesheet Entries</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn-warning"
                  onClick={handleResetAll}
                  disabled={entries.length === 0}
                  title={entries.length === 0 ? 'Nenhum dado para limpar' : ''}
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset All
                </button>
                <button type="button" className="btn-primary" onClick={addEntry} disabled={!selectedWeek}>
                  <Plus className="mr-2 h-4 w-4" /> Add Entry
                </button>
              </div>
            </div>

            <div className={`space-y-3 transition ${resetAnimating ? 'animate-fadeOut' : ''}`}>
              {filteredEntries.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-sm text-gray-600 dark:text-gray-400">
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
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Export</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Generate a CSV with decimal hour totals.</p>
              <button
                type="button"
                className="btn-primary w-fit"
                onClick={exportCsv}
                disabled={actionsDisabled}
              >
                Export CSV
              </button>
            </div>

            <div className="card space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Email Template</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Copy a ready-to-send subject and body or open your mail client.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={copyEmail}
                  disabled={actionsDisabled}
                >
                  {copied ? 'Copied!' : 'Copy to clipboard'}
                </button>
                <a
                  className={`btn-ghost border border-gray-200 dark:border-gray-700 ${actionsDisabled ? 'pointer-events-none opacity-50' : ''}`}
                  aria-disabled={actionsDisabled}
                  tabIndex={actionsDisabled ? -1 : undefined}
                  href={
                    actionsDisabled
                      ? undefined
                      : `mailto:?subject=${encodeURIComponent(emailTemplate().subject)}&body=${emailTemplate().body}`
                  }
                >
                  Open Mail client
                </a>
              </div>
            </div>
          </section>
        </main>
      )}

      {showExportLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white px-6 py-5 text-gray-900 shadow-lg dark:bg-[#1a1a1a] dark:text-gray-100">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/60 border-t-transparent" />
            <p className="text-sm">Gerando seu timesheet...</p>
          </div>
        </div>
      )}

      {showExportModal && (
        <Modal>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Check className="h-5 w-5 text-green-500" />
              <span>CSV Exportado com Sucesso!</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Seu arquivo foi baixado e está pronto para uso.</p>

            <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-4 text-gray-900 shadow-sm dark:border-gray-700 dark:bg-[#1a1a1a] dark:text-gray-100">
              <p className="text-sm font-semibold">📧 Compartilhar por Email</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={copyEmail}>
                  Copy to Clipboard
                </button>
                <a
                  className="btn-ghost border border-gray-200 dark:border-gray-700"
                  href={`mailto:?subject=${encodeURIComponent(emailTemplate().subject)}&body=${emailTemplate().body}`}
                >
                  Open Email Client
                </a>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setShowExportModal(false)}>
                Voltar
              </button>
              <button type="button" className="btn-primary" onClick={closeAndReset}>
                OK
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showResetConfirm && (
        <Modal>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-red-500">
              <Trash2 className="h-5 w-5" />
              <span>⚠️ Confirmar Reset</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Você tem {entries.length} entries preenchidos.</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setShowResetConfirm(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-warning" onClick={confirmResetAll}>
                Confirmar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fadeIn rounded-lg bg-white px-4 py-3 text-sm text-gray-900 shadow-lg dark:bg-[#1a1a1a] dark:text-gray-100">
          {toast.message}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-sm dark:border-gray-700 dark:bg-[#1a1a1a] dark:text-gray-50">
      <p className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}

function ThemeToggle({ theme, setTheme }) {
  return (
    <button
      type="button"
      onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
      className="btn-ghost h-10 w-10 rounded-full border border-gray-200 dark:border-gray-700"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}

function Modal({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg animate-modalIn rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-[#1a1a1a]">
        {children}
      </div>
    </div>
  )
}

function Landing({ onStart, theme, setTheme }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
      <div className="absolute inset-0 animate-pulse-slow bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_45%)]" />
      <div className="absolute right-6 top-6">
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <div className="space-y-2">
          <h1 className="animate-rise text-5xl font-black tracking-tight sm:text-6xl md:text-7xl">SIRUS</h1>
          <p className="animate-fadeIn text-xl font-medium text-gray-600 dark:text-gray-300 sm:text-2xl">Timesheet Builder</p>
        </div>
        <button
          onClick={onStart}
          className="animate-scaleIn inline-flex h-14 w-48 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-white shadow-lg transition hover:scale-105 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <PlayCircle className="mr-2 h-5 w-5" /> Start
        </button>
        <p className="animate-fadeIn-delayed text-xs text-gray-600 dark:text-gray-400">
          Developed By: Egydio Albanese · Version: V1.0
        </p>
      </div>
    </div>
  )
}

function timeToIndex(time) {
  if (!time) return -1
  const [h, m] = time.split(':').map(Number)
  return (h * 60 + m) / 15
}

import { Copy, Trash2, AlertTriangle } from 'lucide-react'
import { serviceCategories, timeOptions, projects } from '../utils/data'
import { getDateBounds, isDateInWeek } from '../utils/date'

const serviceCategoryOptions = Object.keys(serviceCategories)

export default function TimesheetEntryRow({
  entry,
  onChange,
  onDuplicate,
  onDelete,
  weekNumber,
  errors = {},
}) {
  const bounds = getDateBounds(weekNumber)
  const availableScopes = projects.find((p) => p.code === entry.project)?.scopes || []
  const serviceTypes = serviceCategories[entry.serviceCategory] || []

  const handleChange = (field, value) => {
    onChange({ ...entry, [field]: value })
  }

  const startIndex = timeOptions.indexOf(entry.startTime)
  const endIndex = timeOptions.indexOf(entry.endTime)
  const durationMinutes = startIndex >= 0 && endIndex >= 0 ? (endIndex - startIndex) * 15 : 0
  const hoursDecimal = Math.max(durationMinutes / 60, 0)
  const total = hoursDecimal + Number(entry.travelTime || 0)

  const dailyWarning = hoursDecimal > 10
  const maxWarning = hoursDecimal > 24

  const dateOutOfRange = entry.date && weekNumber && !isDateInWeek(entry.date, weekNumber)

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Entry</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Week {String(weekNumber || '').padStart(2, '0')}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost"
            aria-label="Duplicate entry"
            onClick={onDuplicate}
          >
            <Copy className="h-4 w-4" />
            <span className="sr-only">Duplicate</span>
          </button>
          <button
            type="button"
            className="btn-ghost text-red-500 hover:text-red-400"
            aria-label="Delete entry"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Field
          label="Date"
          error={errors.date || (dateOutOfRange ? 'Date must be inside the selected week' : '')}
        >
          <input
            type="date"
            value={entry.date}
            min={bounds.min}
            max={bounds.max}
            onChange={(e) => handleChange('date', e.target.value)}
            aria-invalid={Boolean(errors.date || dateOutOfRange)}
          />
        </Field>

        <Field label="Project" error={errors.project}>
          <select
            value={entry.project}
            onChange={(e) => handleChange('project', e.target.value)}
            aria-invalid={Boolean(errors.project)}
          >
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.code} value={project.code}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Scope" error={errors.scope}>
          <select
            value={entry.scope}
            onChange={(e) => handleChange('scope', e.target.value)}
            aria-invalid={Boolean(errors.scope)}
          >
            <option value="">Select scope</option>
            {availableScopes.map((scope) => (
              <option key={scope} value={scope}>
                {scope}
              </option>
            ))}
            <option value="-">-</option>
          </select>
        </Field>

        <Field label="Service Category" error={errors.serviceCategory}>
          <select
            value={entry.serviceCategory}
            onChange={(e) => handleChange('serviceCategory', e.target.value)}
            aria-invalid={Boolean(errors.serviceCategory)}
          >
            <option value="">Select category</option>
            {serviceCategoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Service Type" error={errors.serviceType}>
          <select
            value={entry.serviceType}
            onChange={(e) => handleChange('serviceType', e.target.value)}
            aria-invalid={Boolean(errors.serviceType)}
          >
            <option value="">Select type</option>
            {serviceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Start Time" error={errors.startTime}>
          <select
            value={entry.startTime}
            onChange={(e) => handleChange('startTime', e.target.value)}
            aria-invalid={Boolean(errors.startTime)}
          >
            <option value="">Start</option>
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </Field>

        <Field label="End Time" error={errors.endTime}>
          <select
            value={entry.endTime}
            onChange={(e) => handleChange('endTime', e.target.value)}
            aria-invalid={Boolean(errors.endTime)}
          >
            <option value="">End</option>
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Travel Time (decimal)" error={errors.travelTime}>
          <input
            type="number"
            step="0.25"
            min="0"
            value={entry.travelTime}
            onChange={(e) => handleChange('travelTime', e.target.value)}
            aria-invalid={Boolean(errors.travelTime)}
          />
        </Field>

        <Field label="Comments">
          <textarea
            rows={2}
            value={entry.comments}
            onChange={(e) => handleChange('comments', e.target.value)}
          />
        </Field>

        <Field label="Hours (decimal)">
          <div className="rounded-lg border border-gray-200/70 bg-white/70 px-3 py-2 text-sm font-semibold text-gray-900 shadow-inner dark:border-white/10 dark:bg-darkCard/80 dark:text-gray-100">
            {hoursDecimal.toFixed(2)}
          </div>
        </Field>

        <Field label="Total (Hours + Travel)">
          <div className="rounded-lg border border-gray-200/70 bg-white/70 px-3 py-2 text-sm font-semibold text-gray-900 shadow-inner dark:border-white/10 dark:bg-darkCard/80 dark:text-gray-100">
            {total.toFixed(2)}
          </div>
        </Field>
      </div>

      {(dailyWarning || maxWarning) && (
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${maxWarning ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-amber-400/40 bg-amber-500/10 text-amber-100'}`}>
          <AlertTriangle className="h-4 w-4" />
          <p>{maxWarning ? 'Maximum 24h per day exceeded' : 'More than 10h logged for this day'}</p>
        </div>
      )}
    </div>
  )
}

function Field({ label, children, error }) {
  return (
    <label className="space-y-1">
      <span className="flex items-center justify-between text-sm font-semibold text-gray-800 dark:text-gray-100">
        {label}
        {error && <span className="text-xs font-medium text-red-400">{error}</span>}
      </span>
      {children}
    </label>
  )
}

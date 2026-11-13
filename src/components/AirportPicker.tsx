import { useId, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { directory, airportInfo, type DirAirport } from '../data/airportDirectory'
import { cx } from './ui'

interface Props {
  label: string
  value: string
  onChange: (code: string) => void
  placeholder: string
  /** Airport codes that cannot be chosen here (keeps origin, connection and destination distinct). */
  exclude?: string[]
  autoFocus?: boolean
}

/** Searchable airport input. Accepts IATA codes, city or airport names, or any 3-letter code. Starts empty. */
export function AirportPicker({ label, value, onChange, placeholder, exclude = [], autoFocus }: Props) {
  const id = useId()
  const sel = airportInfo(value)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const q = query.trim().toLowerCase()
  const DIRECTORY = directory()
  const matches: DirAirport[] = DIRECTORY.filter((a) => !q || [a.code, a.city, a.name, a.country].some((t) => t.toLowerCase().includes(q)))
    .sort((a, b) => (a.code.toLowerCase() === q ? -1 : b.code.toLowerCase() === q ? 1 : 0)).slice(0, 5)
  // Manual entry: any unknown 3-letter code is accepted as typed.
  if (/^[a-z]{3}$/.test(q) && !DIRECTORY.some((a) => a.code.toLowerCase() === q)) {
    matches.push({ code: q.toUpperCase(), name: 'Use this code as entered', city: q.toUpperCase(), country: '', supported: false })
  }
  const blocked = (a: DirAirport) => exclude.includes(a.code)
  const pick = (a: DirAirport) => { if (blocked(a)) return; onChange(a.code); setQuery(''); setOpen(false) }
  return (
    <div className="min-w-0" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false) }}>
      <label htmlFor={id} className="mb-1.5 block text-sub font-medium text-muted-text">{label}</label>
      <div className={cx('field flex min-h-[3.25rem] items-center gap-2 rounded-control px-4 transition-colors focus-within:!border-accent-dark focus-within:ring-4 focus-within:ring-accent/25', sel && '!border-accent-dark/60')}>
        {sel ? <span className="btn-coral grid size-6 shrink-0 place-items-center rounded-full"><Check size={14} strokeWidth={3} /></span> : <Search size={20} className="shrink-0 text-muted" />}
        <input id={id} role="combobox" aria-expanded={open} aria-controls={`${id}-list`} autoComplete="off" autoFocus={autoFocus}
          value={open || !sel ? query : `${sel.city} (${sel.code})`}
          placeholder={placeholder}
          onFocus={() => { setOpen(true); setQuery('') }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (value) onChange('') }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const m = matches.find((a) => !blocked(a)); if (m) pick(m) } if (e.key === 'Escape') setOpen(false) }}
          className="min-h-[3.25rem] min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted" />
      </div>
      {open && (
        <ul id={`${id}-list`} role="listbox" aria-label={`${label} suggestions`} className="glass-medium anim-fade mt-2 overflow-hidden rounded-control">
          {matches.length === 0 && <li className="px-4 py-3 text-body text-muted-text">No match. Type a 3-letter airport code to enter it manually.</li>}
          {matches.map((a) => (
            <li key={a.code} role="option" aria-selected={value === a.code} aria-disabled={blocked(a)}>
              <button type="button" disabled={blocked(a)} onClick={() => pick(a)} onMouseDown={(e) => e.preventDefault()}
                className="flex min-h-14 w-full items-center gap-3  px-4 py-2 text-left disabled:opacity-45">
                <span className="grid h-8 w-12 shrink-0 place-items-center rounded-lg bg-ink-tint text-sub font-bold tracking-wide">{a.code}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-body font-medium">{a.city}</span>
                  <span className="block truncate text-cap text-muted-text">{blocked(a) ? 'Already used in this trip' : a.supported ? `${a.name} · layover guide` : a.name}</span></span>
              </button>
            </li>))}
        </ul>
      )}
    </div>
  )
}

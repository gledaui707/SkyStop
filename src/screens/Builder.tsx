import { Fragment, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, Check, ExternalLink, Info, Plane, Plus, ShieldAlert, Trash2 } from 'lucide-react'
import { useApp } from '../store'
import { getAirport, isSupported } from '../data/mock'
import { fmtDay, fmtDur, fmtTime, isOvernight } from '../data/time'
import { computeItinerary, MODE_LABEL, terminalChoices } from '../data/itinerary'
import { ACCESS_LABEL, BudgetHero } from '../components/BudgetHero'
import { ActionBar, ActivitySheet, Button, Header, Notice, Photo, cx } from '../components/ui'
import type { Activity } from '../data/types'
import type { Hop } from '../domain/itinerary'

/** Build your itinerary: time budget first, then the stops in order with the estimated transfer between each, from
 *  the arrival terminal to the departure terminal. Time feasibility and access (airside/landside, immigration) are
 *  reported separately; nothing unverified is presented as certain. */
export function Builder() {
  const { draft, setDraft, savePlan, go, switchTab, setNotice } = useApp()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [reorder, setReorder] = useState(false)
  const [open, setOpen] = useState<Activity | null>(null)
  if (!draft) return <div><Header title="Itinerary" /><div className="panel mx-5 mt-4 rounded-[1.75rem] p-6 text-center"><p className="text-body">No plan in progress.</p>
    <Button className="mx-auto mt-4" onClick={() => switchTab('airports')}>Explore airports</Button></div></div>
  const ap = getAirport(draft.airport)
  const { items, itin, hero, total: mins } = computeItinerary(draft)
  const terminals = terminalChoices(draft.airport)
  const arrival = new Date(draft.arrival), departure = new Date(draft.departure)
  const night = isOvernight(arrival, departure)
  const over = itin.remaining < 0
  const update = (d: Partial<typeof draft>) => { setDraft({ ...draft, ...d }); setSaved(false) }
  const set = (ids: string[]) => update({ activityIds: ids })
  const remove = (id: string) => set(draft.activityIds.filter((x) => x !== id))
  const move = (i: number, d: -1 | 1) => {
    const ids = [...draft.activityIds]; const j = i + d
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]; set(ids)
  }
  // cumulative usable time consumed by the end of each stop (activities + the transfers to reach them)
  let used = 0
  const rows = items.map((a, i) => { used += (itin.hops[i]?.kind !== 'unknown' ? itin.hops[i]?.max ?? 0 : 0) + a.durationMin; return { a, used, hop: itin.hops[i] } })
  const returnHop = itin.hops[items.length]
  const landside = items.filter((a) => a.access === 'Landside')
  const dayTag = (d: Date) => (d.toDateString() !== arrival.toDateString() ? ` ${fmtDay(d)}` : '')
  const canSave = isSupported(draft.airport)
  /** Saves to the database. "Saved" is shown only after the server confirms; on failure the draft stays as it is. */
  const save = async () => {
    if (saving) return
    setSaving(true); setSaveError(null)
    try {
      const wasNew = !draft.planId
      const p = await savePlan({ ...draft, name: draft.name.trim() || `${ap.city} layover` })
      setDraft({ ...draft, name: p.name, planId: p.id, revision: p.revision }); setSaved(true)
      if (wasNew) { // new trips land on Home, where the trip card appears, with an explicit confirmation
        switchTab('home')
        setNotice(`“${p.name}” is saved. Find it any time in My Plans on this device.`)
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    } finally { setSaving(false) }
  }
  const Dot = ({ cls }: { cls: string }) => <span aria-hidden="true" className={cx('absolute -left-[1.72rem] top-3 size-4 rounded-full ring-4 ring-canvas', cls)} />
  const otherWarnings = itin.warnings.filter((w) => !/outside the transit area|not included: no waiting times/.test(w))

  return (
    <div className="pb-[calc(var(--nav-h)+8.5rem)]">
      <Header title={draft.planId ? 'Edit plan' : 'Your itinerary'} subtitle={`${draft.origin && draft.destination ? draft.origin + ' to ' + draft.destination + ' · ' : ''}${ap.code} · ${fmtDur(mins)} layover`} />
      <div className="px-5 pt-2">
        <label className="block">
          <span className="sr-only">Plan name</span>
          <input value={draft.name} onChange={(e) => update({ name: e.target.value })}
            className="min-h-12 w-full rounded-none border-b border-line bg-transparent text-h1 font-bold focus:border-accent-dark focus:outline-none" />
        </label>
        <div className="mt-4"><BudgetHero n={hero} overnight={night} /></div>

        {/* access status, separate from time */}
        {items.length > 0 && (
          <p className={cx('mt-3 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sub font-semibold',
            itin.access === 'airside' ? 'bg-success-tint text-success' : 'bg-accent-tint text-accent-dark')}>
            {itin.access === 'airside' ? <Check size={18} /> : <ShieldAlert size={18} />}{ACCESS_LABEL[itin.access]}
          </p>)}

        {terminals.length > 0 && (
          <section aria-label="Terminals" className="panel mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 rounded-2xl p-3.5">
            {([['Arriving at', 'arrivalLocation'], ['Departing from', 'departureLocation']] as const).map(([label, key]) => (
              <div key={key} role="group" aria-label={label} className="flex min-w-0 items-center gap-2">
                <span className="w-[6.5rem] shrink-0 text-sub font-semibold">{label}</span>
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  {[...terminals, { id: '', short: 'Not sure', name: 'Not sure' }].map((t) => {
                    const on = (draft[key] ?? '') === t.id
                    return <button key={t.id || 'none'} aria-pressed={on} aria-label={`${label} ${t.name}`} onClick={() => update({ [key]: t.id || null })}
                      className={cx('min-h-9 rounded-full px-3 text-sub font-semibold ring-1', on ? 'bg-ink text-white ring-ink' : 'bg-white text-ink ring-line')}>{t.short}</button>
                  })}
                </div>
              </div>))}
            <p className="text-cap text-muted-text">Used to estimate the walk or train to your first activity and back towards your departure gate.</p>
          </section>)}

        <p className="panel mt-3 flex gap-3 rounded-2xl p-3.5 text-sub text-muted-text"><Info size={18} className="mt-0.5 shrink-0 text-accent-dark" />
          <span>The {fmtDur(hero.buffer)} planning buffer covers leaving the aircraft, transfer screening, the final walk to your gate and boarding. {itin.routing
            ? 'Moving between terminals and venues is counted separately as transfers. Leaving and re-entering the transit area is not covered and has no published time.'
            : `Transfer times between activities are not available for ${ap.city}, so only activity time is counted.`}</span></p>

        {landside.length > 0 && <EntryCheck names={landside.map((a) => a.name)} country={ap.country} url={ap.entryGuidanceUrl}
          onRemove={() => set(draft.activityIds.filter((id) => !landside.some((a) => a.id === id)))} />}

        {otherWarnings.length > 0 && (
          <ul aria-label="Things to check" className="mt-3 grid gap-2">
            {otherWarnings.map((w) => <li key={w} className="flex gap-2.5 rounded-2xl bg-ink-tint px-3.5 py-2.5 text-sub text-ink"><AlertTriangle size={17} className="mt-0.5 shrink-0 text-accent-dark" />{w}</li>)}
          </ul>)}

        <div className="mb-4 mt-8 flex items-center justify-between">
          <h2 className="text-h2 font-bold">Your plan</h2>
          {items.length > 1 && <button aria-pressed={reorder} onClick={() => setReorder(!reorder)} className={cx('press min-h-11 rounded-full px-4 text-sub font-semibold', reorder ? 'bg-ink text-white' : 'bg-white text-ink ring-1 ring-line')}>{reorder ? 'Done' : 'Reorder'}</button>}
        </div>

        <ol aria-label="Itinerary" className="relative ml-[1.1rem] pl-6 before:absolute before:bottom-3 before:left-[-1px] before:top-4 before:w-0.5 before:rounded-full before:bg-gradient-to-b before:from-ink/20 before:via-accent/60 before:to-ink/20">
          <li className="relative pb-3"><span aria-hidden="true" className="absolute -left-[2.15rem] top-0.5 grid size-7 place-items-center rounded-full bg-ink text-white ring-4 ring-canvas"><Plane size={14} className="rotate-45" /></span>
            <p className="text-card font-bold tabular-nums">{fmtTime(arrival)}<span className="text-sub font-normal text-muted-text">{dayTag(arrival)}</span></p>
            <p className="text-sub text-muted-text">Arrive at {ap.code}{draft.arrivalLocation ? ` · ${terminals.find((t) => t.id === draft.arrivalLocation)?.name ?? ''}` : ''}. Allow time to leave the aircraft first.</p></li>

          {rows.length === 0 && (
            <li className="relative pb-4"><Dot cls="bg-line" />
              <div className="rounded-card border border-dashed border-[rgb(35_26_23/0.2)] bg-white/60 p-4 text-body text-muted-text">No activities yet. Use “Add activities” below.</div></li>)}

          {rows.map(({ a, used, hop }, i) => {
            const late = used > hero.usable
            return (
              <Fragment key={a.id}>
              {hop && <li className="relative pb-1"><HopRow h={hop} /></li>}
              <li className="anim-rise relative pb-3">
                <Dot cls={late ? 'bg-error' : a.access === 'Landside' ? 'bg-amber' : 'bg-accent'} />
                <p className={cx('text-sub font-semibold tabular-nums', late ? 'text-error' : 'text-muted-text')}>{i + 1}. {fmtDur(used)} of {fmtDur(hero.usable)} used{late && ' · beyond your usable time'}</p>
                <div className={cx('panel mt-1.5 flex items-center gap-1 rounded-[1.25rem] p-2 pr-1', late && '!border-error/50')}>
                  <button onClick={() => setOpen(a)} className="press flex min-h-14 min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="ph relative size-14 shrink-0 overflow-hidden rounded-2xl"><Photo img={a.image} w={56} h={56} className="absolute inset-0 size-full" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-card font-semibold">{a.name}</span>
                      <span className="block text-sub text-muted-text">{fmtDur(a.durationMin)} · {a.terminal ?? 'Terminal not confirmed'}</span>
                      <ZoneTag a={a} /></span></button>
                  {reorder ? (
                    <>
                      <button aria-label={`Move ${a.name} earlier`} disabled={i === 0} onClick={() => move(i, -1)} className="grid size-11 shrink-0 place-items-center rounded-full text-accent-dark disabled:opacity-25"><ArrowUp size={22} /></button>
                      <button aria-label={`Move ${a.name} later`} disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="grid size-11 shrink-0 place-items-center rounded-full text-accent-dark disabled:opacity-25"><ArrowDown size={22} /></button>
                    </>
                  ) : (
                    <button aria-label={`Remove ${a.name}`} onClick={() => remove(a.id)} className="press grid size-11 shrink-0 place-items-center rounded-full text-error active:bg-error-tint"><Trash2 size={20} /></button>
                  )}
                </div>
              </li>
              </Fragment>
            )
          })}

          {returnHop && <li className="relative pb-1"><HopRow h={returnHop} /></li>}
          <li className="relative pb-5 pt-1"><Dot cls="bg-muted/60" />
            <div className="rounded-[1.25rem] border border-dashed border-[rgb(35_26_23/0.18)] bg-[repeating-linear-gradient(135deg,rgb(35_26_23/0.035)_0_8px,transparent_8px_16px)] p-3.5">
              <p className="text-sub font-semibold">Departure preparation · {fmtDur(hero.buffer)} buffer</p>
              <p className="text-sub text-muted-text">Kept free for airport procedures, the walk to your gate and boarding.</p></div></li>
          <li className="relative"><span aria-hidden="true" className="btn-coral absolute -left-[2.15rem] top-0.5 grid size-7 place-items-center rounded-full ring-4 ring-canvas"><Plane size={14} className="-rotate-45" /></span>
            <p className="text-card font-bold tabular-nums">{fmtTime(departure)}<span className="text-sub font-normal text-muted-text">{dayTag(departure)}</span></p>
            <p className="text-sub text-muted-text">Onward departure{draft.departureLocation ? ` · ${terminals.find((t) => t.id === draft.departureLocation)?.name ?? ''}` : ''}</p></li>
        </ol>

        {isSupported(draft.airport)
          ? <Button variant="secondary" icon={Plus} className="mt-6 w-full" onClick={() => go({ name: 'airport', code: draft.airport, view: 'list' })}>Add activities</Button>
          : <p className="mt-6 text-body text-muted-text">No activity guide for {ap.city} yet. You can still see your time budget.</p>}
        {saveError && <div className="mt-4"><Notice tone="warn"><p className="font-semibold">Plan not saved</p><p>{saveError}</p><p>Your changes are still here. Try again.</p></Notice></div>}
        {!canSave && <p className="mt-4 text-sub text-muted-text">Saving is available for airports with a layover guide.</p>}
      </div>
      <ActionBar>
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 pl-1.5 leading-tight" aria-live="polite">
            {saved ? (
              <span className="flex items-center gap-1.5 text-body font-semibold text-success"><Check size={20} className="shrink-0" />{draft.planId ? 'All changes saved' : 'Saved'}</span>
            ) : (
              <>
                <span className={cx('block whitespace-nowrap text-card font-bold tabular-nums', over ? 'text-error' : 'text-accent-dark')}>{fmtDur(Math.abs(itin.remaining))}<span className="sr-only">{over ? ' over' : ' left'}</span></span>
                <span className="block text-cap text-muted-text"><span aria-hidden="true">{over ? 'over' : 'left'} · </span>{saveError ? 'not saved' : draft.planId ? 'unsaved changes' : 'unsaved'}</span>
              </>
            )}
          </p>
          {saved
            ? <Button variant="secondary" className="shrink-0 px-4" onClick={() => switchTab('plans')}>My plans</Button>
            : <Button className="shrink-0 px-4" disabled={saving || !canSave} aria-busy={saving} onClick={save}>
                {saving ? 'Saving…' : saveError ? 'Try again' : draft.planId ? 'Save changes' : itin.time === 'exceeds' ? 'Save anyway' : 'Save plan'}</Button>}
        </div>
      </ActionBar>
      <ActivitySheet a={open} onClose={() => setOpen(null)} action={open && (
        <Button variant="danger" icon={Trash2} onClick={() => { remove(open.id); setOpen(null) }}>Remove from plan</Button>)} />
    </div>
  )
}

function ZoneTag({ a }: { a: Activity }) {
  const [label, cls] = a.access === 'Airside' ? ['Airside', 'bg-success-tint text-success']
    : a.access === 'Landside' ? ['Landside · Immigration required', 'bg-accent-tint text-accent-dark'] : ['Access conditions unknown', 'bg-ink-tint text-muted-text']
  return <span className={cx('mt-1 inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', cls)}>{label}</span>
}

/** One transfer between stops: duration range, how it is made, checkpoints, and how sure SkyStop is. */
function HopRow({ h }: { h: Hop }) {
  const range = h.min === h.max ? fmtDur(h.max) : `${h.min}–${fmtDur(h.max)}`
  return (
    <div className="mb-2 ml-[-0.15rem] flex gap-2 text-sub" aria-label={`${h.isReturn ? 'Return transfer' : 'Transfer'} to ${h.toLabel}`}>
      <ArrowDown size={16} className="mt-0.5 shrink-0 text-muted" />
      <div className="min-w-0">
        {h.kind === 'unknown' ? (
          <p className="font-semibold text-error">{h.fromLabel.includes('not set') || h.toLabel.includes('not set') ? `${h.isReturn ? 'Return transfer' : 'Transfer'}: choose your terminal to estimate` : 'Transfer time not verified'}</p>
        ) : (
          <p className="text-ink"><b>{h.isReturn ? 'Return transfer' : 'Estimated transfer'}: {range}</b>
            <span className="text-muted-text"> · {h.kind === 'same-area' ? 'within the same area' : [...new Set(h.modes.map((m) => MODE_LABEL[m] ?? m))].join(', then ')}</span></p>
        )}
        <p className="text-cap text-muted-text">
          {h.kind === 'unknown' ? (h.fromLabel.includes('not set') || h.toLabel.includes('not set') ? 'Not counted until a terminal is chosen.' : 'Access between these locations has not been verified. Not counted.')
            : h.verification === 'official' ? 'Range published by the airport · counted at the upper end' : 'Planning estimate, not airport data · counted at the upper end'}
          {h.sources[0] && <> · <a href={h.sources[0]} target="_blank" rel="noreferrer" className="underline underline-offset-2">source</a></>}
        </p>
        {h.immigration && <p className="mt-1 inline-flex rounded-full bg-accent-tint px-2 py-0.5 text-[0.6875rem] font-semibold text-accent-dark">Immigration required · time not included</p>}
        {h.departureChecks && <p className="mt-1 inline-flex rounded-full bg-accent-tint px-2 py-0.5 text-[0.6875rem] font-semibold text-accent-dark">Check-in, departure immigration and security · time not included</p>}
        {h.throughCheck && <p className="mt-1 inline-flex rounded-full bg-ink-tint px-2 py-0.5 text-[0.6875rem] font-semibold text-ink">Through-checked passengers only</p>}
      </div>
    </div>
  )
}

/** Contextual access check for landside activities. Asks only nationality and whether the traveller already has
 *  permission to enter; nothing is stored or sent, and SkyStop never decides eligibility. */
function EntryCheck({ names, country, url, onRemove }: { names: string[]; country: string; url?: string; onRemove: () => void }) {
  const [nationality, setNationality] = useState('')
  const [permission, setPermission] = useState<'yes' | 'no' | 'unsure' | null>(null)
  const [provisional, setProvisional] = useState(false)
  const authority = country === 'Singapore' ? 'Immigration & Checkpoints Authority (ICA)' : country === 'United Kingdom' ? 'GOV.UK'
    : country === 'Portugal' ? 'the Portuguese visa portal' : country === 'United Arab Emirates' ? 'the UAE government portal' : 'the official immigration authority'
  return (
    <section aria-label="Entry check" className="mt-3 rounded-[1.5rem] border border-accent/30 bg-white p-4">
      <p className="flex items-center gap-2 text-sub font-bold text-accent-dark"><ShieldAlert size={18} />Entry verification required · Landside activity</p>
      <p className="mt-1.5 text-body text-ink">{names.join(' and ')} {names.length > 1 ? 'are' : 'is'} outside the transit area. You may need permission to enter {country || 'the country'}.</p>
      <p className="mt-1 text-sub text-muted-text">To reach {names.length > 1 ? 'them' : 'it'} you leave the transit area through arrival immigration, then return through check-in, departure immigration and security. Waiting times are not published, so they are not included in your time budget.</p>
      {!provisional && (
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3">
          <label className="grid gap-1 text-sub font-medium text-muted-text">Passport nationality (optional)
            <input value={nationality} onChange={(e) => setNationality(e.target.value)} autoComplete="off" placeholder="e.g. Indonesian"
              className="min-h-11 min-w-0 rounded-xl border border-[rgb(35_26_23/0.16)] bg-white px-3 text-body text-ink focus:border-accent focus:outline-none" /></label>
          <div role="group" aria-label={`Do you already have permission to enter ${country}?`}>
            <p className="text-sub font-medium text-muted-text">Do you already have permission to enter {country}?</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {([['yes', 'Yes'], ['no', 'No'], ['unsure', "I'm not sure"]] as const).map(([v, l]) => (
                <button key={v} aria-pressed={permission === v} onClick={() => setPermission(v)}
                  className={cx('min-h-10 rounded-full px-3.5 text-sub font-semibold ring-1', permission === v ? 'bg-ink text-white ring-ink' : 'bg-white text-ink ring-line')}>{l}</button>))}
            </div>
          </div>
          {permission && (
            <p role="status" className="rounded-xl bg-ink-tint px-3 py-2 text-sub text-ink">
              {permission === 'yes' ? 'Keep that permission with you. SkyStop cannot check it: the immigration officer decides on entry.'
                : permission === 'no' ? 'Without permission to enter, you may not be able to leave the transit area. Check the official guidance before keeping this activity.'
                : 'Check the official guidance before you travel.'}
              {nationality.trim() && ` Requirements for ${nationality.trim()} passport holders are listed by ${authority}.`}
              {' '}Nationality alone does not decide entry: visas, residence permits, ticket arrangements and document type can matter.
            </p>)}
        </div>)}
      {url && <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sub font-semibold text-accent-dark underline underline-offset-2">Check entry requirements with {authority}<ExternalLink size={14} /></a>}
      <p className="mt-1 text-cap text-muted-text">Your answers stay on this screen. They are not saved or sent anywhere.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {!provisional && <Button variant="secondary" className="flex-1" onClick={() => setProvisional(true)}>Continue provisionally</Button>}
        <Button variant="secondary" className="flex-1" icon={Trash2} onClick={onRemove}>Remove landside {names.length > 1 ? 'activities' : 'activity'}</Button>
      </div>
      {provisional && <p className="mt-2 text-cap text-muted-text">Planning provisionally. Entry verification is still required.</p>}
    </section>
  )
}

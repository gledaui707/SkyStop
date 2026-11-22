import { useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, Check, ExternalLink, Map as MapIcon, Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react'
import { useApp } from '../store'
import { getAirport, isSupported } from '../data/mock'
import { fmtDur, isOvernight } from '../data/time'
import { computeItinerary, terminalChoices } from '../data/itinerary'
import { ItineraryTimeline } from '../components/Timeline'
import { ACCESS_LABEL, BudgetHero } from '../components/BudgetHero'
import { ActionBar, ActivitySheet, Backdrop, Button, Header, Notice, cx, IconButton, SectionHeader, Chip } from '../components/ui'
import type { Activity } from '../data/types'

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
  if (!draft) return <div><Header title="Itinerary" /><div className="panel mx-5 mt-4 rounded-surface p-6 text-center"><p className="text-body">No plan in progress.</p>
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
  const landside = items.filter((a) => a.access === 'Landside')
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
  const otherWarnings = itin.warnings.filter((w) => !/outside the transit area|not included: no waiting times/.test(w))

  return (
    <div className="relative pb-[calc(var(--nav-h)+8.5rem)]">
      <Backdrop img={ap.image} className="h-[22rem]" />
      <Header title={draft.planId ? 'Edit plan' : 'Your itinerary'} subtitle={`${draft.origin && draft.destination ? draft.origin + ' to ' + draft.destination + ' · ' : ''}${ap.code} · ${fmtDur(mins)} layover`} />
      <div className="relative px-5 pt-14">
        <p className="glass-light inline-flex rounded-full px-3 py-1 text-cap font-semibold text-white">{ap.name}</p>
        <label className="mt-2 flex items-center gap-2 border-b border-white/15 focus-within:border-accent-dark">
          <span className="sr-only">Plan name</span>
          <input value={draft.name} onChange={(e) => update({ name: e.target.value })}
            className="min-h-12 min-w-0 flex-1 bg-transparent text-h1 font-bold [text-shadow:0_2px_16px_rgb(0_0_0/0.45)] focus:outline-none" />
          <Pencil size={18} aria-hidden="true" className="shrink-0 text-white/70" />
        </label>
        <div className="mt-4"><BudgetHero n={hero} overnight={night} bufferInfo={`Time kept back for leaving the aircraft, transfer screening, the walk to your gate and boarding.${itin.routing ? ' Transfers between stops are counted separately.' : ''}`}/></div>
        {items.length > 0 && (
          <Button variant="secondary" icon={MapIcon} className="mt-3 w-full" onClick={() => go({ name: 'airport', code: draft.airport, view: 'map', directions: true })}>
            See how to get there</Button>)}

        {/* access status, separate from time */}
        {items.length > 0 && (
          <p className={cx('mt-3 flex items-center gap-2 rounded-control px-3.5 py-2.5 text-sub font-semibold',
            itin.access === 'airside' ? 'bg-success-tint text-success' : 'bg-accent-tint text-accent-dark')}>
            {itin.access === 'airside' ? <Check size={18} /> : <ShieldAlert size={18} />}{ACCESS_LABEL[itin.access]}
          </p>)}

        {terminals.length > 0 && (
          <section aria-label="Terminals" className="panel mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 rounded-control p-3.5">
            {([['Arriving at', 'arrivalLocation'], ['Departing from', 'departureLocation']] as const).map(([label, key]) => (
              <div key={key} role="group" aria-label={label} className="flex min-w-0 items-center gap-2">
                <span className="w-[6.5rem] shrink-0 text-sub font-semibold">{label}</span>
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  {[...terminals, { id: '', short: 'Not sure', name: 'Not sure' }].map((t) => {
                    const on = (draft[key] ?? '') === t.id
                    return <button key={t.id || 'none'} aria-pressed={on} aria-label={`${label} ${t.name}`} onClick={() => update({ [key]: t.id || null })}
                      className={cx('min-h-9 rounded-full px-3 text-sub font-semibold ring-1', on ? 'pill-on ring-transparent' : 'bg-ink-tint text-ink ring-line')}>{t.short}</button>
                  })}
                </div>
              </div>))}
          </section>)}


        {landside.length > 0 && <EntryCheck names={landside.map((a) => a.name)} country={ap.country} url={ap.entryGuidanceUrl}
          onRemove={() => set(draft.activityIds.filter((id) => !landside.some((a) => a.id === id)))} />}

        {otherWarnings.length > 0 && (
          <ul aria-label="Things to check" className="mt-3 grid gap-2">
            {otherWarnings.map((w) => <li key={w} className="flex gap-2.5 rounded-control bg-ink-tint px-3.5 py-2.5 text-sub text-ink"><AlertTriangle size={17} className="mt-0.5 shrink-0 text-accent-dark" />{w}</li>)}
          </ul>)}

        <SectionHeader className="mb-4 mt-8" action={items.length > 1 && <Chip active={reorder} onClick={() => setReorder(!reorder)}>{reorder ? 'Done' : 'Reorder'}</Chip>}>Your plan</SectionHeader>

        <ItineraryTimeline airportCode={ap.code} arrival={arrival} departure={departure}
          arrivalNote={draft.arrivalLocation ? terminals.find((t) => t.id === draft.arrivalLocation)?.name : undefined}
          departureNote={draft.departureLocation ? terminals.find((t) => t.id === draft.departureLocation)?.name : undefined}
          items={items} hops={itin.hops} usable={hero.usable} buffer={hero.buffer} onOpen={setOpen}
          empty={<div className="grid gap-3 rounded-card border border-dashed border-white/20 bg-ink-tint p-4 text-body text-muted-text">No activities yet.
            {isSupported(draft.airport) && <button type="button" onClick={() => go({ name: 'airport', code: draft.airport, view: 'list' })} className="press flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-accent-dark bg-transparent text-body font-semibold text-accent-dark"><Plus size={18} />Add activities</button>}</div>}
          actions={(a, i, n) => reorder ? (
            <>
              <IconButton label={`Move ${a.name} earlier`} icon={ArrowUp} tone="accent" size="sm" disabled={i === 0} onClick={() => move(i, -1)} />
              <IconButton label={`Move ${a.name} later`} icon={ArrowDown} tone="accent" size="sm" disabled={i === n - 1} onClick={() => move(i, 1)} />
            </>
          ) : (
            <IconButton label={`Remove ${a.name}`} icon={Trash2} tone="danger" size="sm" iconSize={20} onClick={() => remove(a.id)} />
          )} />

        {isSupported(draft.airport)
          ? (items.length > 0 && <button type="button" onClick={() => go({ name: 'airport', code: draft.airport, view: 'list' })} className="mt-6 press flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-accent-dark bg-transparent text-body font-semibold text-accent-dark"><Plus size={18} />Add activities</button>)
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
                <span className="block whitespace-nowrap text-cap text-muted-text max-[360px]:text-micro"><span aria-hidden="true">{over ? 'over' : 'left'} · </span>{saveError ? 'not saved' : draft.planId ? 'unsaved changes' : 'unsaved'}</span>
              </>
            )}
          </p>
          {saved
            ? <Button variant="secondary" className="shrink-0 px-4" onClick={() => switchTab('plans')}>My plans</Button>
            : <Button className="shrink-0 px-4 max-[360px]:px-3.5 max-[360px]:text-body" disabled={saving || !canSave} aria-busy={saving} onClick={save}>
                {saving ? 'Saving…' : saveError ? 'Try again' : draft.planId ? 'Save changes' : itin.time === 'exceeds' ? 'Save anyway' : 'Save plan'}</Button>}
        </div>
      </ActionBar>
      <ActivitySheet a={open} onClose={() => setOpen(null)} action={open && (
        <Button variant="danger" icon={Trash2} onClick={() => { remove(open.id); setOpen(null) }}>Remove from plan</Button>)} />
    </div>
  )
}

/** Contextual access check for landside activities. Asks only nationality and whether the traveller already has
 *  permission to enter; nothing is stored or sent, and SkyStop never decides eligibility. */
function EntryCheck({ names, country, url, onRemove }: { names: string[]; country: string; url?: string; onRemove: () => void }) {
  const { profile } = useApp()
  // Prefilled from the optional Profile nationality, if any; edits here stay on this screen.
  const [nationality, setNationality] = useState(profile?.nationality ?? '')
  const [permission, setPermission] = useState<'yes' | 'no' | 'unsure' | null>(null)
  const [provisional, setProvisional] = useState(false)
  const authority = country === 'Singapore' ? 'Immigration & Checkpoints Authority (ICA)' : country === 'United Kingdom' ? 'GOV.UK'
    : country === 'Portugal' ? 'the Portuguese visa portal' : country === 'United Arab Emirates' ? 'the UAE government portal' : 'the official immigration authority'
  return (
    <section aria-label="Entry check" className="panel-accent mt-3 rounded-card p-4">
      <p className="flex items-center gap-2 text-sub font-bold text-accent-dark"><ShieldAlert size={18} />Entry verification required · Landside activity</p>
      <p className="mt-1.5 text-body text-ink">{names.join(' and ')} {names.length > 1 ? 'are' : 'is'} outside the transit area. You may need permission to enter {country || 'the country'}.</p>
      <p className="mt-1 text-sub text-muted-text">To reach {names.length > 1 ? 'them' : 'it'} you leave the transit area through arrival immigration, then return through check-in, departure immigration and security. Waiting times are not published, so they are not included in your time budget.</p>
      {!provisional && (
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3">
          <label className="grid gap-1 text-sub font-medium text-muted-text">Passport nationality (optional)
            <input value={nationality} onChange={(e) => setNationality(e.target.value)} autoComplete="off" placeholder="e.g. Indonesian"
              className="field min-h-11 min-w-0 rounded-xl px-3 text-body focus:!border-accent-dark focus:outline-none" /></label>
          <div role="group" aria-label={`Do you already have permission to enter ${country}?`}>
            <p className="text-sub font-medium text-muted-text">Do you already have permission to enter {country}?</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {([['yes', 'Yes'], ['no', 'No'], ['unsure', "I'm not sure"]] as const).map(([v, l]) => (
                <button key={v} aria-pressed={permission === v} onClick={() => setPermission(v)}
                  className={cx('min-h-10 rounded-full px-3.5 text-sub font-semibold ring-1', permission === v ? 'pill-on ring-transparent' : 'bg-ink-tint text-ink ring-line')}>{l}</button>))}
            </div>
          </div>
          {permission && (
            <p role="status" className="rounded-xl bg-ink-tint px-3 py-2 text-sub text-ink">
              {permission === 'yes' ? 'Keep that permission with you. The immigration officer decides on entry.'
                : permission === 'no' ? 'Without permission to enter, you may not be able to leave the transit area. Check the official guidance before keeping this activity.'
                : 'Check the official guidance before you travel.'}
              {nationality.trim() && ` Requirements for ${nationality.trim()} passport holders are listed by ${authority}.`}
              {' '}Nationality alone does not decide entry: visas, residence permits, ticket arrangements and document type can matter.
            </p>)}
        </div>)}
      {url && <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sub font-semibold text-accent-dark underline underline-offset-2">Check entry requirements with {authority}<ExternalLink size={14} /></a>}
      <div className="mt-3 flex flex-wrap gap-2">
        {!provisional && <Button variant="secondary" className="flex-1" onClick={() => setProvisional(true)}>Continue provisionally</Button>}
        <Button variant="secondary" className="flex-1" icon={Trash2} onClick={onRemove}>Remove landside {names.length > 1 ? 'activities' : 'activity'}</Button>
      </div>
      {provisional && <p className="mt-2 text-cap text-muted-text">Planning provisionally. Entry verification is still required.</p>}
    </section>
  )
}

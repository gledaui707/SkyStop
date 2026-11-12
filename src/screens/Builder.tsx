import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Info, Plane, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../store'
import { getAirport, ACTIVITIES, isSupported } from '../data/mock'
import { budget, fmtDay, fmtDur, fmtTime, isOvernight, layoverMinutesAt } from '../data/time'
import { BudgetHero } from '../components/BudgetHero'
import { ActionBar, ActivitySheet, Button, Header, Notice, Photo, cx } from '../components/ui'
import type { Activity } from '../data/types'

/** Build your itinerary: time budget first, then the activities in an estimated order between arrival and departure.
 *  Clock times are shown only for the fixed points (arrival, departure); activities show durations and how much of the
 *  usable time they use, so the plan does not suggest that the first activity starts the moment the plane lands. */
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
  const items = draft.activityIds.map((id) => ACTIVITIES.find((a) => a.id === id)!).filter(Boolean)
  const mins = layoverMinutesAt(draft.arrival, draft.departure, ap.timezone)
  const b = budget(mins, draft.bufferMin, items)
  const arrival = new Date(draft.arrival), departure = new Date(draft.departure)
  const night = isOvernight(arrival, departure)
  const set = (ids: string[]) => { setDraft({ ...draft, activityIds: ids }); setSaved(false) }
  const remove = (id: string) => set(draft.activityIds.filter((x) => x !== id))
  const move = (i: number, d: -1 | 1) => {
    const ids = [...draft.activityIds]; const j = i + d
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]; set(ids)
  }
  let used = 0
  const rows = items.map((a) => { used += a.durationMin; return { a, used } })
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
  return (
    <div className="pb-[calc(var(--nav-h)+8.5rem)]">
      <Header title={draft.planId ? 'Edit plan' : 'Your itinerary'} subtitle={`${draft.origin && draft.destination ? draft.origin + ' to ' + draft.destination + ' · ' : ''}${ap.code} · ${fmtDur(mins)} layover`} />
      <div className="px-5 pt-2">
        <label className="block">
          <span className="sr-only">Plan name</span>
          <input value={draft.name} onChange={(e) => { setDraft({ ...draft, name: e.target.value }); setSaved(false) }}
            className="min-h-12 w-full rounded-none border-b border-line bg-transparent text-h1 font-bold focus:border-accent-dark focus:outline-none" />
        </label>
        <div className="mt-4"><BudgetHero b={b} overnight={night} /></div>
        <p className="panel mt-3 flex gap-3 rounded-2xl p-3.5 text-sub text-muted-text"><Info size={18} className="mt-0.5 shrink-0 text-accent-dark" />
          <span>The {fmtDur(b.buffer)} planning buffer is kept free for airport procedures: leaving the aircraft, transfer security or passport control, walking to the gate and boarding. Activities only use the remaining {fmtDur(b.usable)}.</span></p>

        <div className="mb-4 mt-8 flex items-center justify-between">
          <h2 className="text-h2 font-bold">Your plan</h2>
          {items.length > 1 && <button aria-pressed={reorder} onClick={() => setReorder(!reorder)} className={cx('press min-h-11 rounded-full px-4 text-sub font-semibold', reorder ? 'bg-white text-[#2a1b18]' : 'bg-white/10 text-ink ring-1 ring-line')}>{reorder ? 'Done' : 'Reorder'}</button>}
        </div>

        <ol className="relative ml-[1.1rem] pl-6 before:absolute before:bottom-3 before:left-[-1px] before:top-4 before:w-0.5 before:rounded-full before:bg-gradient-to-b before:from-white/50 before:via-accent/60 before:to-white/40">
          <li className="relative pb-5"><span aria-hidden="true" className="absolute -left-[2.15rem] top-0.5 grid size-7 place-items-center rounded-full bg-white text-[#2a1b18] ring-4 ring-canvas"><Plane size={14} className="rotate-45" /></span>
            <p className="text-card font-bold tabular-nums">{fmtTime(arrival)}<span className="text-sub font-normal text-muted-text">{dayTag(arrival)}</span></p>
            <p className="text-sub text-muted-text">Arrive at {ap.code}. Allow time to leave the aircraft and pass any transfer checks first.</p></li>

          {rows.length === 0 && (
            <li className="relative pb-4"><Dot cls="bg-line" />
              <div className="rounded-card border border-dashed border-white/25 bg-white/[0.03] p-4 text-body text-muted-text">No activities yet. Use “Add activities” below.</div></li>)}

          {rows.map(({ a, used }, i) => {
            const late = used > b.usable
            return (
              <li key={a.id} className="anim-rise relative pb-4"><Dot cls={late ? 'bg-error' : 'bg-accent'} />
                <p className={cx('text-sub font-semibold tabular-nums', late ? 'text-error' : 'text-muted-text')}>{i + 1}. {fmtDur(used)} of {fmtDur(b.usable)} used{late && ' · beyond your usable time'}</p>
                <div className={cx('panel mt-1.5 flex items-center gap-1 rounded-[1.25rem] p-2 pr-1', late && '!border-error/50')}>
                  <button onClick={() => setOpen(a)} className="press flex min-h-14 min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="ph relative size-14 shrink-0 overflow-hidden rounded-2xl"><Photo img={a.image} w={56} h={56} className="absolute inset-0 size-full" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-card font-semibold">{a.name}</span>
                      <span className="block text-sub text-muted-text">{fmtDur(a.durationMin)} · {a.costLabel}</span></span></button>
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
            )
          })}

          <li className="relative pb-5 pt-1"><Dot cls="bg-white/40" />
            <div className="rounded-[1.25rem] border border-dashed border-white/20 bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.04)_0_8px,transparent_8px_16px)] p-3.5">
              <p className="text-sub font-semibold">Planning buffer · {fmtDur(b.buffer)}</p>
              <p className="text-sub text-muted-text">Kept free across your layover for airport procedures and getting back to the gate.</p></div></li>
          <li className="relative"><span aria-hidden="true" className="btn-coral absolute -left-[2.15rem] top-0.5 grid size-7 place-items-center rounded-full ring-4 ring-canvas"><Plane size={14} className="-rotate-45" /></span>
            <p className="text-card font-bold tabular-nums">{fmtTime(departure)}<span className="text-sub font-normal text-muted-text">{dayTag(departure)}</span></p>
            <p className="text-sub text-muted-text">Onward departure</p></li>
        </ol>

        {isSupported(draft.airport)
          ? <Button variant="secondary" icon={Plus} className="mt-6 w-full" onClick={() => go({ name: 'airport', code: draft.airport, view: 'list' })}>Add activities</Button>
          : <p className="mt-6 text-body text-muted-text">No activity guide for {ap.city} yet. You can still see your time budget.</p>}
        {items.length > 0 && <p className="mt-3 text-sub text-muted-text">{items.length} {items.length === 1 ? 'activity' : 'activities'} · order is an estimate; times on the day may vary.</p>}
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
                <span className={cx('block whitespace-nowrap text-card font-bold tabular-nums', b.over ? 'text-error' : 'text-accent-dark')}>{fmtDur(Math.abs(b.remaining))}<span className="sr-only">{b.over ? ' over' : ' left'}</span></span>
                <span className="block text-cap text-muted-text"><span aria-hidden="true">{b.over ? 'over' : 'left'} · </span>{saveError ? 'not saved' : draft.planId ? 'unsaved changes' : 'unsaved'}</span>
              </>
            )}
          </p>
          {saved
            ? <Button variant="secondary" className="shrink-0 px-4" onClick={() => switchTab('plans')}>My plans</Button>
            : <Button className="shrink-0 px-4" disabled={saving || !canSave} aria-busy={saving} onClick={save}>
                {saving ? 'Saving…' : saveError ? 'Try again' : draft.planId ? 'Save changes' : b.over ? 'Save anyway' : 'Save plan'}</Button>}
        </div>
      </ActionBar>
      <ActivitySheet a={open} onClose={() => setOpen(null)} action={open && (
        <Button variant="danger" icon={Trash2} onClick={() => { remove(open.id); setOpen(null) }}>Remove from plan</Button>)} />
    </div>
  )
}

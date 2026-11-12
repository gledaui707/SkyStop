import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Plane, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../store'
import { getAirport, ACTIVITIES, isSupported } from '../data/mock'
import { budget, fmtDay, fmtDur, fmtTime, isOvernight, layoverMinutes } from '../data/time'
import { BudgetHero } from '../components/BudgetHero'
import { ActionBar, ActivitySheet, Button, Header, Notice, cx } from '../components/ui'
import type { Activity } from '../data/types'

/** Screen 4: build your itinerary. A timeline from arrival to departure. */
export function Builder() {
  const { draft, setDraft, savePlan, go, switchTab } = useApp()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [reorder, setReorder] = useState(false)
  const [open, setOpen] = useState<Activity | null>(null)
  if (!draft) return <div><Header title="Itinerary" /><div className="p-6 text-center"><p className="text-body">No plan in progress.</p>
    <Button className="mx-auto mt-4" onClick={() => switchTab('airports')}>Explore airports</Button></div></div>
  const ap = getAirport(draft.airport)
  const items = draft.activityIds.map((id) => ACTIVITIES.find((a) => a.id === id)!).filter(Boolean)
  const mins = layoverMinutes(draft.arrival, draft.departure)
  const b = budget(mins, draft.bufferMin, items)
  const arrival = new Date(draft.arrival), departure = new Date(draft.departure)
  const night = isOvernight(arrival, departure)
  const usableEnd = new Date(departure.getTime() - draft.bufferMin * 60000)
  const set = (ids: string[]) => { setDraft({ ...draft, activityIds: ids }); setSaved(false) }
  const remove = (id: string) => set(draft.activityIds.filter((x) => x !== id))
  const move = (i: number, d: -1 | 1) => {
    const ids = [...draft.activityIds]; const j = i + d
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]; set(ids)
  }
  let cursor = arrival.getTime()
  const rows = items.map((a) => { const start = new Date(cursor); cursor += a.durationMin * 60000; return { a, start, end: new Date(cursor) } })
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
      if (wasNew) switchTab('home') // new trips land on Home, where the trip card appears
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    } finally { setSaving(false) }
  }
  const Dot = ({ cls }: { cls: string }) => <span className={cx('absolute -left-[1.62rem] top-3 size-4 rounded-full border-[3px] border-canvas', cls)} />
  return (
    <div className="pb-48">
      <Header title={draft.planId ? 'Edit plan' : 'Your itinerary'} subtitle={`${draft.origin && draft.destination ? draft.origin + ' to ' + draft.destination + ' · ' : ''}${ap.code} · ${fmtDur(mins)} layover`} />
      <div className="px-5 pt-2">
        <label className="block">
          <span className="sr-only">Plan name</span>
          <input value={draft.name} onChange={(e) => { setDraft({ ...draft, name: e.target.value }); setSaved(false) }}
            className="min-h-12 w-full border-b border-line bg-transparent text-h2 font-bold focus:border-accent focus:outline-none" />
        </label>
        <div className="mt-4"><BudgetHero b={b} overnight={night} /></div>

        <div className="mb-3 mt-6 flex items-center justify-between">
          <h2 className="text-h2 font-bold">Timeline</h2>
          {items.length > 1 && <button aria-pressed={reorder} onClick={() => setReorder(!reorder)} className={cx('min-h-11 rounded-full px-4 text-sub font-semibold', reorder ? 'bg-accent-tint text-accent-dark ring-1 ring-accent' : 'bg-white text-accent-dark ring-1 ring-line')}>{reorder ? 'Done' : 'Reorder'}</button>}
        </div>

        <ol className="relative ml-[1.1rem] border-l-2 border-line pl-6">
          <li className="relative pb-4"><Dot cls="bg-ink" />
            <p className="text-body font-semibold tabular-nums">{fmtTime(arrival)}<span className="font-normal text-muted-text">{dayTag(arrival)}</span></p>
            <p className="flex items-center gap-1.5 text-sub text-muted-text"><Plane size={16} />Arrive at {ap.code}</p></li>

          {rows.length === 0 && (
            <li className="relative pb-4"><Dot cls="bg-line" />
              <div className="rounded-card border border-dashed border-muted p-4 text-body text-muted-text">No activities yet. Add some from the airport map.</div></li>)}

          {rows.map(({ a, start, end }, i) => {
            const late = end.getTime() > usableEnd.getTime()
            return (
              <li key={a.id} className="relative pb-3"><Dot cls={late ? 'bg-error' : 'bg-accent'} />
                <p className={cx('text-sub font-semibold tabular-nums', late && 'text-error')}>{fmtTime(start)} – {fmtTime(end)}{dayTag(start)}{late && ' · past usable time'}</p>
                <div className={cx('mt-1 flex items-center gap-1 rounded-card border bg-surface py-1 pl-4 pr-1', late ? 'border-error/40' : 'border-line')}>
                  <button onClick={() => setOpen(a)} className="min-h-14 min-w-0 flex-1 py-1 text-left">
                    <span className="block truncate text-card font-semibold">{a.name}</span>
                    <span className="block text-sub text-muted-text">{fmtDur(a.durationMin)} · {a.costLabel}</span></button>
                  {reorder ? (
                    <>
                      <button aria-label={`Move ${a.name} earlier`} disabled={i === 0} onClick={() => move(i, -1)} className="grid size-11 place-items-center rounded-full text-accent-dark disabled:opacity-25"><ArrowUp size={22} /></button>
                      <button aria-label={`Move ${a.name} later`} disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="grid size-11 place-items-center rounded-full text-accent-dark disabled:opacity-25"><ArrowDown size={22} /></button>
                    </>
                  ) : (
                    <button aria-label={`Remove ${a.name}`} onClick={() => remove(a.id)} className="grid size-11 place-items-center rounded-full text-error active:bg-error-tint"><Trash2 size={20} /></button>
                  )}
                </div>
              </li>
            )
          })}

          <li className="relative pb-4 pt-1"><Dot cls="bg-muted/50" />
            <p className="text-sub font-semibold tabular-nums">{fmtTime(usableEnd)} – {fmtTime(departure)}<span className="font-normal text-muted-text">{dayTag(departure)}</span></p>
            <p className="text-sub text-muted-text">Reserved buffer · {fmtDur(b.buffer)}</p></li>
          <li className="relative"><Dot cls="bg-ink" />
            <p className="text-body font-semibold tabular-nums">{fmtTime(departure)}<span className="font-normal text-muted-text">{dayTag(departure)}</span></p>
            <p className="text-sub text-muted-text">Onward departure</p></li>
        </ol>

        {isSupported(draft.airport)
          ? <Button variant="secondary" icon={Plus} className="mt-6 w-full" onClick={() => go({ name: 'airport', code: draft.airport, view: 'map' })}>Add activities</Button>
          : <p className="mt-6 text-body text-muted-text">No activity guide for {ap.city} yet. You can still see your time budget.</p>}
        {items.length > 0 && <p className="mt-3 text-sub text-muted-text">{items.length} {items.length === 1 ? "activity" : "activities"}</p>}
      </div>
      <ActionBar>
        {saved ? (
          <div className="flex items-center gap-3">
            <p className="flex flex-1 items-center gap-2 pl-2 text-body font-semibold text-success"><Check size={20} />Plan saved</p>
            <Button variant="secondary" onClick={() => switchTab('plans')}>My plans</Button>
          </div>
        ) : (
          <>
            {saveError && <div className="mb-2"><Notice tone="warn"><p className="font-semibold">Plan not saved</p><p>{saveError}</p></Notice></div>}
            {!canSave && <p className="mb-2 px-1 text-sub text-muted-text">Saving is available for airports with a layover guide.</p>}
            <Button className="w-full" disabled={saving || !canSave} aria-busy={saving} onClick={save}>{saving ? 'Saving…' : saveError ? 'Try again' : b.over ? 'Save plan anyway' : 'Save plan'}</Button>
          </>
        )}
      </ActionBar>
      <ActivitySheet a={open} onClose={() => setOpen(null)} action={open && (
        <Button variant="danger" icon={Trash2} onClick={() => { remove(open.id); setOpen(null) }}>Remove from plan</Button>)} />
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ChevronRight, Database, Globe, LogOut, PenLine, RotateCcw, ShieldCheck, SlidersHorizontal, Trash2, UserRound } from 'lucide-react'
import { useApp } from '../store'
import { getSupabase } from '../api/client'
import { avatarUrl, createAccount, removeAvatar, signIn, signOut, updateName, uploadAvatar } from '../api/account'
import { ensureGuestSession } from '../api/session'
import { deleteProfile, saveProfile } from '../api/repositories'
import { Button, Header, InfoTip, Notice, cx, inputCls, SectionHeader, Sheet, Surface } from '../components/ui'
import { AboutData } from '../components/AboutData'
import { DemoControls } from '../features/flightUpdates/DemoControls'

/** Country names for the optional nationality / residence fields (ISO 3166 regions known to the browser). */
function countryNames(): string[] {
  try {
    const dn = new Intl.DisplayNames(['en'], { type: 'region' })
    const out = new Set<string>()
    for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b), name = dn.of(code)
      if (name && name !== code && !/Unknown|Outlying|Pseudo|^E[UZ]$|world|Europe|Latin|Union|Nations/i.test(name)) out.add(name)
    }
    return [...out].sort((x, y) => x.localeCompare(y))
  } catch { return [] }
}

function Avatar({ src, size }: { src: string | null; size: string }) {
  return src
    ? <img src={src} alt="" className={cx(size, 'shrink-0 rounded-full object-cover ring-2 ring-white shadow-md')} />
    : <span className={cx(size, 'grid shrink-0 place-items-center rounded-full bg-ink-tint text-muted-text ring-1 ring-line')}><UserRound size={26} /></span>
}

const Section = ({ title, action, children, bare }: { title: string; action?: React.ReactNode; children: React.ReactNode; bare?: boolean }) => (
  <section aria-label={title} className="grid gap-3">
    <SectionHeader kind="label" action={action}>{title}</SectionHeader>
    {bare ? <div className="grid grid-cols-[minmax(0,1fr)] gap-3">{children}</div>
      : <Surface className="grid grid-cols-[minmax(0,1fr)] gap-3 p-4">{children}</Surface>}
  </section>
)

export function Profile() {
  const { account, refreshAccount, profile, setProfile, plans, replayOnboarding, route, go } = useApp()
  const countries = useMemo(countryNames, [])
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState<'create' | 'signin' | null>(route.name === 'profile' ? route.auth ?? null : null)
  const [sent, setSent] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nationality, setNationality] = useState(profile?.nationality ?? '')
  const [residence, setResidence] = useState(profile?.residence ?? '')
  const [editingDocs, setEditingDocs] = useState(false)
  const [name, setName] = useState(account.name ?? '')
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [about, setAbout] = useState(false)
  const [controls, setControls] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => { setName(account.name ?? '') }, [account.name])
  // A different person (sign-out, sign-in) means different travel details: never keep the previous ones on screen.
  useEffect(() => { setNationality(profile?.nationality ?? ''); setResidence(profile?.residence ?? '') }, [profile, account.userId])
  useEffect(() => {
    let live = true
    if (!account.avatarPath) { setPhoto(null); return }
    void avatarUrl(getSupabase(), account.avatarPath).then((u) => { if (live) setPhoto(u) })
    return () => { live = false }
  }, [account.avatarPath])
  const sb = getSupabase()

  const run = async (fn: () => Promise<void>) => {
    if (busy) return
    setBusy(true); setError(null)
    try { await fn() } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  const submitEmail = () => run(async () => {
    if (mode === 'create') await createAccount(sb, email); else await signIn(sb, email)
    setSent(email.trim()); await refreshAccount()
  })
  const saveDocs = () => run(async () => {
    const p = await saveProfile(sb, { nationality: nationality.trim() || null, residence: residence.trim() || null })
    setProfile(p); setEditingDocs(false); await refreshAccount()
  })
  const logOut = () => run(async () => { await signOut(sb); setMode(null); setSent(null); await refreshAccount() })
  const saveName = () => run(async () => { await ensureGuestSession(sb); await updateName(sb, name); await refreshAccount() })
  const pickPhoto = async (f: File | undefined) => {
    if (!f || photoBusy) return
    setPhotoBusy(true); setError(null)
    try { const uid = await ensureGuestSession(sb); await uploadAvatar(sb, uid, f); await refreshAccount() }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setPhotoBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }
  const dropPhoto = () => run(async () => { if (account.userId) await removeAvatar(sb, account.userId); await refreshAccount() })
  const clearDocs = () => run(async () => {
    await deleteProfile(sb); setProfile(null); setNationality(''); setResidence(''); setEditingDocs(false)
  })

  const guest = account.status !== 'registered'
  const savedDocs = !!profile && !editingDocs
  const docsDirty = nationality !== (profile?.nationality ?? '') || residence !== (profile?.residence ?? '')
  const passportHead = (
    <div className="flex items-center gap-3.5">
      <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-black/20 text-[var(--gold)] ring-1 ring-[var(--gold)]/35">
        <Globe size={26} strokeWidth={1.4} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-cap font-semibold uppercase tracking-[0.18em] text-[var(--gold)]">Passport</p>
        <p className="text-sub text-white/80">Travel details</p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-cap font-medium text-white/80"><ShieldCheck size={14} />Private</span>
    </div>
  )

  return (
    <div className="relative pb-[calc(var(--nav-h)+2rem)]">
      <Header title="Profile" />
      <div className="relative grid grid-cols-[minmax(0,1fr)] gap-7 px-5 pt-2">
        {/* identity card: the screen's focal point; for a guest it carries the one main action */}
        <section aria-label="Your profile" className="instrument relative grid gap-5 overflow-hidden rounded-tray p-5">
          <div className="flex items-center gap-4">
            <span className="shrink-0 rounded-full p-[3px] [background:var(--sunset-grad)] shadow-[var(--shadow-glow)]"><span className="block rounded-full bg-canvas p-[2px]"><Avatar src={photo} size="size-16" /></span></span>
            <div className="min-w-0">
              <p className="truncate text-h1 font-bold leading-tight">{account.name || (account.status === 'registered' ? account.email : 'Guest')}</p>
              <p className="text-sub text-muted-text">{account.status === 'registered' ? 'Signed in' : account.status === 'guest-pending' ? 'Confirmation pending' : 'Saved on this device only'}</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 divide-x divide-line rounded-card bg-deep/30 py-3 ring-1 ring-line">
            {[[plans.length, plans.length === 1 ? 'Flight' : 'Flights'], [plans.filter((p) => p.activityIds.length).length, plans.filter((p) => p.activityIds.length).length === 1 ? 'Itinerary' : 'Itineraries']].map(([n, l]) => (
              <div key={l} className="flex flex-col-reverse items-center px-3">
                <dt className="text-cap font-medium text-muted-text">{l}</dt>
                <dd className="text-h1 font-bold tabular-nums">{n}</dd>
              </div>))}
          </dl>
          {guest && (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-1">
              {account.status === 'guest-pending' && <div className="mb-2"><Notice tone="info">Check {account.pendingEmail} for a confirmation link. Your guest flights move with you once it is confirmed.</Notice></div>}
              <Button onClick={() => go({ name: 'access', auth: 'create' })}>Create account</Button>
              <p className="flex flex-wrap items-center justify-center gap-x-1 text-sub text-muted-text">Keep your plans on any device.
                <Button variant="tertiary" size="sm" className="px-2" onClick={() => go({ name: 'access', auth: 'signin' })}>Sign in</Button></p>
              {error && <Notice tone="warn">{error}</Notice>}
            </div>
          )}
        </section>

        {!guest && (
        <Section title="Account">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={photoBusy} aria-label={photo ? 'Change profile picture' : 'Add profile picture'} className="press relative shrink-0">
              <Avatar src={photo} size="size-[4.5rem]" />
              <span className="absolute -bottom-0.5 -right-0.5 grid size-7 place-items-center pill-on rounded-full ring-2 ring-canvas"><Camera size={14} /></span>
            </button>
            <div className="grid min-w-0 gap-0.5">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={photoBusy} className="min-h-9 text-left text-sub font-semibold text-accent-dark">{photoBusy ? 'Uploading…' : photo ? 'Change photo' : 'Add photo'}</button>
              {photo && <button type="button" onClick={dropPhoto} disabled={busy} className="min-h-9 text-left text-sub font-medium text-muted-text">Remove photo</button>}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
          </div>
          <form className="grid gap-1.5" onSubmit={(e) => { e.preventDefault(); void saveName() }}>
            <label htmlFor="profile-name" className="text-sub font-medium text-muted-text">Name</label>
            <div className="flex gap-2">
              <input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" placeholder="Your name" className={cx(inputCls, 'flex-1')} />
              {name.trim() !== (account.name ?? '') && <Button type="submit" className="shrink-0 px-4" disabled={busy}>Save</Button>}
            </div>
          </form>
          <div className="grid gap-1.5">
            <p className="text-sub font-medium text-muted-text">Email</p>
            <p className="flex min-h-[3.25rem] items-center truncate rounded-control bg-ink-tint px-4 text-body text-ink">{account.email}</p>
          </div>
          {error && <Notice tone="warn">{error}</Notice>}
        </Section>)}

        {/* travel documents: one passport, written into while editing, read back once saved */}
        <section aria-label="Travel documents" className="grid gap-3">
          <SectionHeader kind="label" action={
            <InfoTip id="docs-help" title="Travel documents">Optional. Used only to tailor entry guidance for activities outside the transit area. It never decides whether you may enter a country. SkyStop does not ask for passport numbers or document photos.</InfoTip>}>Travel documents</SectionHeader>
          {savedDocs ? (
            <aside aria-label="Passport details" className="passport relative grid gap-5 overflow-hidden rounded-tray p-5">
              {passportHead}
              <dl className="grid grid-cols-[minmax(0,1fr)] gap-3 border-t border-[var(--gold)]/20 pt-4">
                <div className="flex items-baseline justify-between gap-3"><dt className="shrink-0 text-cap font-semibold uppercase tracking-[0.12em] text-[var(--gold)]">Nationality</dt><dd className="truncate text-card font-semibold">{profile.nationality || 'Not set'}</dd></div>
                <div className="flex items-baseline justify-between gap-3"><dt className="shrink-0 text-cap font-semibold uppercase tracking-[0.12em] text-[var(--gold)]">Residence</dt><dd className="truncate text-card font-semibold">{profile.residence || 'Not set'}</dd></div>
              </dl>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setEditingDocs(true)} className="passport-btn press flex min-h-11 items-center justify-center gap-2 rounded-full text-sub font-semibold"><PenLine size={16} />Edit</button>
                <button type="button" disabled={busy} onClick={clearDocs} className="passport-btn press flex min-h-11 items-center justify-center gap-2 rounded-full text-sub font-semibold disabled:opacity-50"><Trash2 size={16} />Remove</button>
              </div>
            </aside>
          ) : (
            <form className="passport relative grid grid-cols-[minmax(0,1fr)] gap-4 overflow-hidden rounded-tray p-5" onSubmit={(e) => { e.preventDefault(); if ((nationality.trim() || residence.trim()) && docsDirty) void saveDocs() }}>
              {passportHead}
              <datalist id="countries">{countries.map((c) => <option key={c} value={c} />)}</datalist>
              <label className="grid gap-1.5 text-cap font-semibold uppercase tracking-[0.12em] text-[var(--gold)]">Passport nationality
                <input list="countries" value={nationality} onChange={(e) => setNationality(e.target.value)} className="passport-field block min-h-[3.25rem] w-full min-w-0 rounded-control px-4 text-body font-medium normal-case tracking-normal" placeholder="e.g. Indonesia" autoComplete="off" /></label>
              <label className="grid gap-1.5 text-cap font-semibold uppercase tracking-[0.12em] text-[var(--gold)]">Country of residence
                <input list="countries" value={residence} onChange={(e) => setResidence(e.target.value)} className="passport-field block min-h-[3.25rem] w-full min-w-0 rounded-control px-4 text-body font-medium normal-case tracking-normal" placeholder="Optional" autoComplete="off" /></label>
              <p className="text-cap text-white/80">No passport numbers or document photos. Only you can see these details.</p>
              {(editingDocs || nationality.trim() || residence.trim()) && (
                <div className={editingDocs ? 'grid grid-cols-2 gap-2' : 'grid'}>
                  <Button type="submit" disabled={busy || !(nationality.trim() || residence.trim()) || !docsDirty}>Save</Button>
                  {editingDocs && <button type="button" className="passport-btn press min-h-[3.25rem] rounded-full text-body font-semibold" onClick={() => { setEditingDocs(false); setNationality(profile?.nationality ?? ''); setResidence(profile?.residence ?? '') }}>Cancel</button>}
                </div>)}
            </form>
          )}
        </section>

        <section aria-label="Settings" className="grid gap-3">
          <SectionHeader kind="label">Settings</SectionHeader>
          <div className="panel overflow-hidden rounded-surface">
            <SettingRow icon={RotateCcw} title="Replay introduction" onClick={replayOnboarding} />
            <SettingRow icon={Database} title="About & data" sub="Sample data, sources and limitations" onClick={() => setAbout(true)} more />
            <SettingRow icon={SlidersHorizontal} title="Demo controls" sub="Simulate flight update" onClick={() => setControls(true)} more />
            {account.status !== 'none' && <SettingRow icon={LogOut} title="Log out" onClick={() => void logOut()} danger />}
          </div>
        </section>
      </div>
      <Sheet open={about} onClose={() => setAbout(false)} title="About & data"><AboutData /></Sheet>
      <DemoControls open={controls} onClose={() => setControls(false)} />
    </div>
  )
}

/** One row of the grouped settings list: icon well, title, optional caption and chevron. */
function SettingRow({ icon: Icon, title, sub, onClick, more, danger }: { icon: typeof Database; title: string; sub?: string; onClick: () => void; more?: boolean; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cx('group-row press flex min-h-[3.75rem] w-full items-center gap-3.5 px-4 py-2.5 text-left text-body font-medium transition-colors active:bg-ink-tint', danger && 'text-error')}>
      <span aria-hidden="true" className={cx('grid size-9 shrink-0 place-items-center rounded-[0.7rem]', danger ? 'bg-error-tint text-error' : 'bg-accent-tint text-accent-dark')}><Icon size={18} /></span>
      <span className="min-w-0 flex-1">{title}{sub && <span className="block text-cap font-normal text-muted-text">{sub}</span>}</span>
      {more && <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-muted-text" />}
    </button>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Globe, LogOut, PenLine, Mail, RotateCcw, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { useApp } from '../store'
import { getSupabase } from '../api/client'
import { avatarUrl, createAccount, removeAvatar, signIn, signOut, updateName, uploadAvatar } from '../api/account'
import { ensureGuestSession } from '../api/session'
import { deleteProfile, saveProfile } from '../api/repositories'
import { Button, Header, InfoTip, Notice, cx, inputCls, SectionHeader, Surface } from '../components/ui'

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

  return (
    <div className="pb-[calc(var(--nav-h)+2rem)]">
      <Header title="Profile" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-7 px-5 pt-2">
        <div className="flex items-center gap-4">
          <Avatar src={photo} size="size-14" />
          <div className="min-w-0">
            <p className="truncate text-h2 font-bold">{account.name || (account.status === 'registered' ? account.email : 'Guest')}</p>
            {account.status !== 'guest' && account.status !== 'none' && <p className="text-sub text-muted-text">{account.status === 'registered' ? 'Signed in' : 'Guest · confirmation pending'}</p>}
          </div>
        </div>

        <Section title="Account">
          {account.status === 'registered' && (<>
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
          </>)}
          {account.status === 'registered' ? null : (
            <>
              {account.status === 'guest-pending' && <Notice tone="info">Check {account.pendingEmail} for a confirmation link. Your guest flights move with you once it is confirmed.</Notice>}
              <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
                <Button onClick={() => go({ name: 'access', auth: 'create' })}>Create account</Button>
                <Button variant="secondary" onClick={() => go({ name: 'access', auth: 'signin' })}>Sign in</Button>
              </div>
              {error && <Notice tone="warn">{error}</Notice>}
            </>
          )}
          {account.status === 'registered' && error && <Notice tone="warn">{error}</Notice>}
        </Section>

        <Section title="Travel documents" bare={!!profile && !editingDocs} action={
          <InfoTip id="docs-help" title="Travel documents">Optional. Used only to tailor entry guidance for activities outside the transit area. It never decides whether you may enter a country. SkyStop does not ask for passport numbers or document photos.</InfoTip>}>
          {profile && !editingDocs ? (
            <>
              {/* saved: a small passport cover (same composition as the Overnight connection card) */}
              <aside aria-label="Passport details" className="relative flex items-center gap-4 overflow-hidden rounded-surface bg-gradient-to-br from-[#6e1f30] to-[#3b0f1b] p-4 text-white">
                <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-8 size-28 rounded-full border border-[#f1d49a]/15" />
                <div aria-hidden="true" className="relative grid size-16 shrink-0 place-items-center rounded-full bg-[#8a3346] text-[#f1d49a] ring-1 ring-[#f1d49a]/30">
                  <Globe size={30} strokeWidth={1.4} />
                </div>
                <div className="min-w-0">
                  <p className="text-cap font-semibold tracking-wide text-[#f1d49a]">Passport</p>
                  <p className="truncate text-card font-semibold">{profile.nationality || 'Nationality not set'}</p>
                  {profile.residence && <p className="mt-0.5 truncate text-sub text-white/80">Lives in {profile.residence}</p>}
                </div>
              </aside>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" icon={PenLine} onClick={() => setEditingDocs(true)}>Edit</Button>
                <Button variant="secondary" icon={Trash2} disabled={busy} onClick={clearDocs}>Remove</Button>
              </div>
            </>
          ) : (
            <>
              <datalist id="countries">{countries.map((c) => <option key={c} value={c} />)}</datalist>
              <label className="grid gap-1.5 text-sub font-medium text-muted-text">Passport nationality
                <input list="countries" value={nationality} onChange={(e) => setNationality(e.target.value)} className={inputCls} placeholder="e.g. Indonesia" autoComplete="off" /></label>
              <label className="grid gap-1.5 text-sub font-medium text-muted-text">Country of residence
                <input list="countries" value={residence} onChange={(e) => setResidence(e.target.value)} className={inputCls} placeholder="Optional" autoComplete="off" /></label>
              <p className="flex gap-2 text-cap text-muted-text"><ShieldCheck size={15} className="mt-px shrink-0" />Only you can see these details.</p>
              {(editingDocs || nationality.trim() || residence.trim()) && (
                <div className={editingDocs ? 'grid grid-cols-2 gap-2' : 'grid'}>
                  <Button disabled={busy || !(nationality.trim() || residence.trim()) || (nationality === (profile?.nationality ?? '') && residence === (profile?.residence ?? ''))} onClick={saveDocs}>Save</Button>
                  {editingDocs && <Button variant="secondary" onClick={() => { setEditingDocs(false); setNationality(profile?.nationality ?? ''); setResidence(profile?.residence ?? '') }}>Cancel</Button>}
                </div>)}
            </>
          )}
        </Section>

        <Section title="Settings">
          <button onClick={replayOnboarding} className="press flex min-h-12 items-center gap-3 text-left text-body font-medium"><RotateCcw size={19} className="text-accent-dark" />Replay introduction</button>
          {account.status !== 'none' && (
            <button onClick={() => void logOut()}
              className="press flex min-h-12 items-center gap-3  pt-3 text-left text-body font-medium text-error"><LogOut size={19} />Log out</button>)}
        </Section>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, LogOut, Mail, RotateCcw, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { useApp } from '../store'
import { getSupabase } from '../api/client'
import { avatarUrl, createAccount, removeAvatar, signIn, signOut, updateName, uploadAvatar } from '../api/account'
import { ensureGuestSession } from '../api/session'
import { deleteProfile, saveProfile } from '../api/repositories'
import { Button, Header, Notice, cx, inputCls } from '../components/ui'

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
    : <span className={cx(size, 'btn-coral grid shrink-0 place-items-center rounded-full')}><UserRound size={26} /></span>
}

const Section = ({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) => (
  <section aria-label={title} className="grid gap-3">
    <div className="flex min-h-9 items-center justify-between gap-3 px-1">
      <h2 className="text-cap font-semibold uppercase tracking-[0.12em] text-muted-text">{title}</h2>{action}</div>
    <div className="panel grid grid-cols-[minmax(0,1fr)] gap-3 rounded-[1.5rem] p-4">{children}</div>
  </section>
)

export function Profile() {
  const { account, refreshAccount, profile, setProfile, plans, replayOnboarding } = useApp()
  const countries = useMemo(countryNames, [])
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState<'create' | 'signin' | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nationality, setNationality] = useState(profile?.nationality ?? '')
  const [residence, setResidence] = useState(profile?.residence ?? '')
  const [savedNote, setSavedNote] = useState<string | null>(null)
  const [docsHelp, setDocsHelp] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [name, setName] = useState(account.name ?? '')
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => { setName(account.name ?? '') }, [account.name])
  useEffect(() => {
    let live = true
    if (!account.avatarPath) { setPhoto(null); return }
    void avatarUrl(getSupabase(), account.avatarPath).then((u) => { if (live) setPhoto(u) })
    return () => { live = false }
  }, [account.avatarPath])
  const sb = getSupabase()
  const guest = account.status !== 'registered'

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
    setProfile(p); setSavedNote('Saved to your profile.'); await refreshAccount()
  })
  const logOut = () => run(async () => { await signOut(sb); setConfirmLogout(false); setMode(null); setSent(null); await refreshAccount() })
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
    await deleteProfile(sb); setProfile(null); setNationality(''); setResidence(''); setSavedNote('Your travel details were removed.')
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
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={photoBusy} aria-label={photo ? 'Change profile picture' : 'Add profile picture'} className="press relative shrink-0">
              <Avatar src={photo} size="size-[4.5rem]" />
              <span className="absolute -bottom-0.5 -right-0.5 grid size-7 place-items-center rounded-full bg-ink text-white ring-2 ring-white"><Camera size={14} /></span>
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
          {account.status === 'registered' && (
            <div className="grid gap-1.5">
              <p className="text-sub font-medium text-muted-text">Email</p>
              <p className="flex min-h-[3.25rem] items-center truncate rounded-2xl bg-ink-tint px-4 text-body text-ink">{account.email}</p>
            </div>)}
          {account.status === 'registered' ? null : (
            <>
              {account.status === 'guest-pending' && <Notice tone="info">Check {account.pendingEmail} for a confirmation link. Your guest flights move with you once it is confirmed.</Notice>}
              {sent ? (
                <Notice tone="info"><p className="font-semibold">Check your email</p><p>We sent a link to {sent}. Open it on this device to {mode === 'create' ? 'confirm your account' : 'sign in'}.</p></Notice>
              ) : mode ? (
                <form className="grid gap-2.5" onSubmit={(e) => { e.preventDefault(); void submitEmail() }} noValidate>
                  <label className="grid gap-1.5 text-sub font-medium text-muted-text">Email
                    <input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" /></label>
                  {mode === 'create' && <p className="text-cap text-muted-text">Your current flights and plans stay with you: the account is added to this guest session.</p>}
                  {mode === 'signin' && plans.length > 0 && <p className="text-cap text-muted-text">Signing in switches to that account. The {plans.length} {plans.length === 1 ? 'flight' : 'flights'} saved as a guest here are not merged into it. To keep them, create an account instead.</p>}
                  <Button type="submit" icon={Mail} disabled={busy || !email.trim()}>{busy ? 'Sending…' : mode === 'create' ? 'Send confirmation link' : 'Send sign-in link'}</Button>
                  <button type="button" onClick={() => { setMode(null); setError(null) }} className="min-h-11 text-sub font-semibold text-muted-text">Cancel</button>
                </form>
              ) : (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
                  <Button onClick={() => setMode('create')}>Create account</Button>
                  <Button variant="secondary" onClick={() => setMode('signin')}>Sign in</Button>
                </div>
              )}
              {error && <Notice tone="warn">{error}</Notice>}
            </>
          )}
          {account.status === 'registered' && error && <Notice tone="warn">{error}</Notice>}
        </Section>

        <Section title="Travel documents" action={
          <button type="button" aria-expanded={docsHelp} aria-controls="docs-help" onClick={() => setDocsHelp(!docsHelp)}
            className="min-h-9 text-sub font-semibold text-accent-dark underline underline-offset-2">What is this?</button>}>
          <p id="docs-help" hidden={!docsHelp} className="text-sub text-muted-text">Optional. Used only to tailor entry guidance for activities outside the transit area. It never decides whether you may enter a country. SkyStop does not ask for passport numbers or document photos.</p>
          <datalist id="countries">{countries.map((c) => <option key={c} value={c} />)}</datalist>
          <label className="grid gap-1.5 text-sub font-medium text-muted-text">Passport nationality
            <input list="countries" value={nationality} onChange={(e) => { setNationality(e.target.value); setSavedNote(null) }} className={inputCls} placeholder="e.g. Indonesia" autoComplete="off" /></label>
          <label className="grid gap-1.5 text-sub font-medium text-muted-text">Country of residence
            <input list="countries" value={residence} onChange={(e) => { setResidence(e.target.value); setSavedNote(null) }} className={inputCls} placeholder="Optional" autoComplete="off" /></label>
          <p className="flex gap-2 text-cap text-muted-text"><ShieldCheck size={15} className="mt-px shrink-0" />Only you can read these details{guest ? ' (in this guest session)' : ''}.</p>
          {savedNote && <p role="status" className="text-sub font-medium text-success">{savedNote}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button disabled={busy || (nationality === (profile?.nationality ?? '') && residence === (profile?.residence ?? ''))} onClick={saveDocs}>Save</Button>
            <Button variant="secondary" icon={Trash2} disabled={busy || !profile} onClick={clearDocs}>Remove</Button>
          </div>
        </Section>

        <Section title="Settings">
          <button onClick={replayOnboarding} className="press flex min-h-12 items-center gap-3 text-left text-body font-medium"><RotateCcw size={19} className="text-accent-dark" />Replay introduction</button>
          {account.status !== 'none' && (
            <button onClick={() => (account.status === 'registered' || plans.length === 0 ? void logOut() : setConfirmLogout(true))}
              className="press flex min-h-12 items-center gap-3 border-t border-line pt-3 text-left text-body font-medium text-error"><LogOut size={19} />Log out</button>)}
          {confirmLogout && (
            <div role="alertdialog" aria-label="Log out of the guest session?" className="grid gap-2 rounded-2xl bg-error-tint p-3.5">
              <p className="text-sub text-ink">You are a guest. After logging out, the {plans.length} {plans.length === 1 ? 'flight' : 'flights'} saved in this guest session can no longer be opened. Create an account first to keep them.</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="danger" disabled={busy} onClick={() => void logOut()}>Log out</Button>
                <Button variant="secondary" onClick={() => setConfirmLogout(false)}>Cancel</Button>
              </div>
            </div>)}
        </Section>
      </div>
    </div>
  )
}

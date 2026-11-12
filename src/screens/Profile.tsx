import { useMemo, useState } from 'react'
import { Info, LogOut, Mail, RotateCcw, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { useApp } from '../store'
import { getSupabase } from '../api/client'
import { createAccount, signIn, signOut } from '../api/account'
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

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section aria-label={title} className="grid gap-3">
    <h2 className="px-1 text-cap font-semibold uppercase tracking-[0.12em] text-muted-text">{title}</h2>
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
  const clearDocs = () => run(async () => {
    await deleteProfile(sb); setProfile(null); setNationality(''); setResidence(''); setSavedNote('Your travel details were removed.')
  })

  return (
    <div className="pb-[calc(var(--nav-h)+2rem)]">
      <Header title="Profile" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-7 px-5 pt-2">
        <div className="flex items-center gap-4">
          <span className="btn-coral grid size-14 shrink-0 place-items-center rounded-full"><UserRound size={26} /></span>
          <div className="min-w-0">
            <p className="truncate text-h2 font-bold">{account.status === 'registered' ? account.email : 'Guest'}</p>
            {account.status !== 'guest' && account.status !== 'none' && <p className="text-sub text-muted-text">{account.status === 'registered' ? 'Signed in' : 'Guest · confirmation pending'}</p>}
          </div>
        </div>

        <Section title="Account">
          {account.status === 'registered' ? (
            <>
              <p className="text-body text-ink/85">Your flights and plans are saved to this account. Sign in with the same email on another browser or device to see them there.</p>
              <Button variant="secondary" icon={LogOut} disabled={busy} onClick={() => run(async () => { await signOut(sb); await refreshAccount() })}>Sign out</Button>
            </>
          ) : (
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
        </Section>

        <Section title="Travel documents">
          <div>
            <button type="button" aria-expanded={docsHelp} aria-controls="docs-help" onClick={() => setDocsHelp(!docsHelp)}
              className="min-h-9 text-sub font-semibold text-accent-dark underline underline-offset-2">What is this?</button>
            <p id="docs-help" hidden={!docsHelp} className="mt-1 text-sub text-muted-text">Optional. Used only to tailor entry guidance for activities outside the transit area. It never decides whether you may enter a country. SkyStop does not ask for passport numbers or document photos.</p>
          </div>
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
          <div className={cx('flex gap-3 border-t border-line pt-3 text-sub text-muted-text')}><Info size={18} className="mt-0.5 shrink-0" />
            <p>SkyStop opens sample booking references only; it does not connect to airlines. Flight comparisons use sample schedules. Venue details come from the airports’ websites; check opening hours and entry rules before you travel.</p></div>
        </Section>
      </div>
    </div>
  )
}

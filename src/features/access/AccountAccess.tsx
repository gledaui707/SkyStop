import { useEffect, useRef, type CSSProperties } from 'react'
import { ArrowRight } from 'lucide-react'
import { useApp } from '../../store'
import { getSupabase } from '../../api/client'
// Original SS path data (splashscreen/): the same geometry as the logo files, recoloured here.
import { cutout, letter } from '../splash/geometry'
import './access.css'

/** Vertical glass strips over the glow: left edge and width in % of the composition, a material, optional slow drift.
 *  Uneven widths and three blur strengths make the glow step and smear at each edge, like ribbed glass. */
type Strip = { l: number; w: number; m: 'clear' | 'frost' | 'haze'; drift?: 1 | 2 }
const STRIPS: Strip[] = [
  { l: 0, w: 10, m: 'haze' },
  { l: 10.4, w: 7, m: 'clear' },
  { l: 17.8, w: 9.5, m: 'frost' },
  { l: 27.6, w: 12, m: 'clear', drift: 1 },
  { l: 40, w: 6, m: 'haze' },
  { l: 46.4, w: 10.5, m: 'frost' },
  { l: 57.3, w: 5.5, m: 'clear' },
  { l: 63.2, w: 13, m: 'haze', drift: 2 },
  { l: 76.6, w: 8, m: 'frost' },
  { l: 85, w: 7, m: 'clear' },
  { l: 92.4, w: 7.6, m: 'haze' },
]
/** Lobes of light, back to front. */
const LOBES = ['halo', 'upper', 'body', 'lower', 'flare', 'core'] as const
/** Hairline highlights where light catches a glass edge. */
const EDGES = [10.2, 17.6, 39.8, 57.1, 76.4, 92.2]

/** The monogram's box in logo units: front S x 420–794, rear S drawn 100 units to the right, y 312–608. */
const VIEW = '420 312 474 296'
/** Rear S minus the front S and the plane cutout, exactly as in ss-coral-layered.svg ("behind-front"). */
const behindFront = (id: string) => `<mask id="${id}" maskUnits="userSpaceOnUse" x="400" y="300" width="550" height="320"><path fill="white" d="M400 300H950V620H400Z"/><path fill="black" d="${letter}"/><path fill="black" d="${cutout}"/></mask>`
/** Alpha mask that cuts the frosted-glass layer to the rear S. A CSS mask (not clip-path) is what Safari honours on backdrop-filter. */
const REAR_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW}" preserveAspectRatio="none"><defs>${behindFront('m')}</defs><g mask="url(#m)"><path d="${letter}" transform="translate(100 0)"/></g></svg>`)}")`

/** White front S with the airplane cutout over a rear S of frosted glass (real backdrop blur), so the glow shows through it. */
function GlassMonogram() {
  return (
    <span className="access__mark" aria-hidden="true">
      <span className="access__mark-glass" style={{ WebkitMaskImage: REAR_MASK, maskImage: REAR_MASK }} />
      <svg className="access__mark-edge" viewBox={VIEW} preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id="access-rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset=".55" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#fff" stopOpacity=".7" />
          </linearGradient>
          <mask id="access-behind" maskUnits="userSpaceOnUse" x="400" y="300" width="550" height="320">
            <path fill="white" d="M400 300H950V620H400Z" /><path fill="black" d={letter} /><path fill="black" d={cutout} />
          </mask>
        </defs>
        {/* The mask sits on the untransformed group, as in the original file: a mask on the shifted path would shift with it. */}
        <g mask="url(#access-behind)">
          <path d={letter} transform="translate(100 0)" fill="none" stroke="url(#access-rim)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      <svg className="access__mark-front" viewBox={VIEW} preserveAspectRatio="none" focusable="false">
        <defs>
          <mask id="access-cut" maskUnits="userSpaceOnUse" x="400" y="300" width="410" height="320">
            <path fill="white" d="M400 300H810V620H400Z" /><path fill="black" d={cutout} />
          </mask>
        </defs>
        <path d={letter} fill="#fff" mask="url(#access-cut)" />
      </svg>
    </span>
  )
}

/** Account Access: shown once after onboarding. The animated light and glass are the screen; three plain choices sit below.
 *  Create account / Sign in open the existing email-link flow on Profile; guests go straight to Home (no account is made). */
export function AccountAccess() {
  const { finishAccess, account } = useApp()
  const root = useRef<HTMLDivElement>(null)

  // A visitor who already has a session (a guest who saved something, or an email link that just signed them in) has chosen.
  useEffect(() => {
    if (account.status !== 'none') { finishAccess(); return }
    let live = true
    void getSupabase().auth.getSession().then(({ data }) => { if (live && data.session) finishAccess() }).catch(() => { /* offline: stay */ })
    return () => { live = false }
  }, [account.status, finishAccess])

  // Battery: pause the ambient motion while the page is in the background.
  useEffect(() => {
    const el = root.current
    const sync = () => el?.toggleAttribute('data-paused', document.visibilityState === 'hidden')
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  return (
    <div ref={root} className="access">
      <div className="access__stage" aria-hidden="true">
        <div className="access__composition">
          <div className="access__light">
            {LOBES.map((n) => <span key={n} className={`access__orbit access__orbit--${n}`}><span className={`access__blob access__blob--${n}`} /></span>)}
          </div>
          <div className="access__veil" />
          <div className="access__glass">
            {STRIPS.map((s) => (
              <span key={s.l} className={`access__strip access__strip--${s.m}${s.drift ? ` access__strip--drift${s.drift}` : ''}`}
                style={{ left: `${s.l}%`, width: `${s.w}%` } as CSSProperties} />
            ))}
            {EDGES.map((x) => <span key={x} className="access__edge" style={{ left: `${x}%` }} />)}
          </div>
          <div className="access__grain" />
        </div>
      </div>

      <div className="access__content">
        <div className="access__brand">
          <GlassMonogram />
          <h1 className="access__wordmark">SkyStop</h1>
          <p className="access__tagline">Your layover, reimagined.</p>
        </div>

        <div className="access__actions" role="group" aria-label="Account">
          <button type="button" className="access__btn access__btn--primary press" onClick={() => finishAccess({ name: 'profile', auth: 'create' })}>
            Create account
          </button>
          <button type="button" className="access__btn access__btn--secondary press" onClick={() => finishAccess({ name: 'profile', auth: 'signin' })}>
            Sign in
          </button>
          <button type="button" className="access__guest press" onClick={() => finishAccess()}>
            Continue as guest<ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

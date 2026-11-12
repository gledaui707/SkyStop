import { ArrowRight, Plane } from 'lucide-react'
import { useApp } from '../store'
import { IMAGES, sized } from '../data/images'

/** First visit only: one full-bleed focal image, one dominant action, a secondary path and Skip. */
export function Welcome() {
  const { finishWelcome } = useApp()
  return (
    <div className="ph relative flex min-h-dvh flex-col overflow-hidden text-white">
      <img src={sized(IMAGES.hero, 900, 1700)} alt={IMAGES.hero.alt} title={`Photo: ${IMAGES.hero.credit} / Unsplash`}
        onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} className="anim-kenburns absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-transparent" />
      <div className="photo-fade absolute inset-x-0 bottom-0 h-[68%]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[45%] bg-[radial-gradient(80%_60%_at_15%_100%,rgb(234_81_57/0.35),transparent_70%)]" />

      <div className="relative flex flex-1 flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(var(--safe-top)+0.25rem)]">
        <div className="flex items-center justify-between">
          <span className="glass-dark flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sub font-semibold">
            <span className="btn-coral grid size-8 place-items-center rounded-full"><Plane size={16} className="-rotate-45" /></span>SkyStop
          </span>
          <button onClick={() => finishWelcome({ name: 'discover' })} className="glass-dark press min-h-11 rounded-full px-5 text-sub font-semibold">Skip</button>
        </div>

        <div className="anim-rise mt-auto">
          <p className="glass-light inline-flex rounded-full px-3 py-1 text-cap font-semibold uppercase tracking-[0.08em]">Layover planner</p>
          <h1 className="mt-4 text-[2.5rem] font-bold leading-[1.05] tracking-[-0.03em]">More than a<br />connection.</h1>
          <p className="mt-3 max-w-[22rem] text-body text-white/85">Know your usable time. Then plan it.</p>
          <div className="mt-7 flex items-center gap-3">
            <button onClick={() => finishWelcome({ name: 'trip' })}
              className="btn-coral press flex min-h-14 flex-1 items-center justify-between rounded-full pl-6 pr-2 text-[1.125rem] font-bold">
              Plan a layover<span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-white/20"><ArrowRight size={20} /></span>
            </button>
          </div>
          <button onClick={() => finishWelcome({ name: 'find' })}
            className="glass-dark press mt-3 min-h-14 w-full rounded-full text-body font-semibold">Compare connections</button>
        </div>
      </div>
    </div>
  )
}

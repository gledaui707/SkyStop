import { useApp } from '../store'
import { IMAGES, sized } from '../data/images'
import { Button } from '../components/ui'

/** First visit only: one focal image, two choices, and Skip. */
export function Welcome() {
  const { finishWelcome } = useApp()
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-deep text-white">
      <img src={sized(IMAGES.hero, 900, 1700)} alt={IMAGES.hero.alt} title={`Photo: ${IMAGES.hero.credit} / Unsplash`}
        onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-deep/35 via-transparent to-transparent" /><div className="photo-fade absolute inset-x-0 bottom-0 h-[60%]" />
      <div className="relative flex flex-1 flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(var(--safe-top)+0.75rem)]">
        <div className="mt-auto">
          <h1 className="text-title font-bold">More than a connection.</h1>
          <Button className="mt-6 w-full" onClick={() => finishWelcome({ name: 'trip' })}>Add my flight</Button>
          <button onClick={() => finishWelcome({ name: 'find' })}
            className="glass-dark mt-3 min-h-[3.25rem] w-full rounded-[0.875rem] text-body font-semibold">Plan ahead</button>
          <button onClick={() => finishWelcome({ name: 'discover' })} className="mx-auto mt-2 block min-h-11 px-6 text-body text-white/80">Skip</button>
        </div>
      </div>
    </div>
  )
}

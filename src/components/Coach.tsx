import { useApp } from '../store'

const TIPS = {
  1: { title: 'Add your journey', text: 'Enter the flights you have already booked. You choose where you are flying and where you connect.' },
  2: { title: 'Understand your available time', text: 'Total layover minus a reserved airport buffer leaves your usable time. Activities use up only that.' },
  3: { title: 'Build your layover experience', text: 'Browse activities on the map or list, pick a curated itinerary, then save your plan.' },
} as const

/** Optional inline hint. Sits above the content it explains and never covers it. */
export function Coach({ step }: { step: 1 | 2 | 3 }) {
  const { hint, nextHint, skipHints } = useApp()
  if (hint !== step) return null
  const t = TIPS[step]
  return (
    <section aria-label={`Tip ${step} of 3`} className="rounded-card bg-deep p-4 text-white">
      <div className="flex items-center justify-between">
        <p className="text-cap font-semibold uppercase tracking-wider text-accent">Tip {step} of 3</p>
        <div className="flex gap-1.5" aria-hidden="true">{[1, 2, 3].map((n) => <span key={n} className={`h-1.5 w-5 rounded-full ${n <= step ? 'bg-[#ffb5a5]' : 'bg-white/25'}`} />)}</div>
      </div>
      <h2 className="mt-1.5 text-card font-semibold">{t.title}</h2>
      <p className="mt-1 text-sub text-white/80">{t.text}</p>
      <div className="mt-3 flex items-center justify-between">
        <button onClick={skipHints} className="min-h-11 px-1 text-body text-white/75">Skip</button>
        <button onClick={nextHint} className="min-h-11 rounded-full bg-white px-6 text-body font-semibold text-deep">{step === 3 ? 'Done' : 'Next'}</button>
      </div>
    </section>
  )
}

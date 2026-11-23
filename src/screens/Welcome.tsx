import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { IntroSlides } from '../features/onboarding/IntroSlides'
import { Onboarding } from '../features/onboarding/Onboarding'

/** First run: splash → the three photographic intro slides (optional) → the booking-first conversation → Home.
 *  Get started or Skip on any slide (or moving on from the last one) crossfades into the conversation. */
export function Welcome() {
  const [phase, setPhase] = useState<'slides' | 'talk'>('slides')
  return (
    <AnimatePresence mode="wait" initial={false}>
      {phase === 'slides' ? (
        <motion.div key="slides" exit={{ opacity: 0, transition: { duration: 0.28 } }}>
          <IntroSlides onDone={() => setPhase('talk')} />
        </motion.div>
      ) : (
        <motion.div key="talk" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.32 } }}>
          <Onboarding />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

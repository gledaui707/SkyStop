import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { IntroSlides } from '../features/onboarding/IntroSlides'
import { Onboarding } from '../features/onboarding/Onboarding'

/** First run: the three photographic intro slides, then the short conversation, then Account Access.
 *  Get started on the last slide crossfades into the conversation; Skip on either goes to Account Access. */
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

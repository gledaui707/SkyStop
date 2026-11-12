import { useId } from 'react'
import { cutout, letter } from '../features/splash/geometry'

/** The SS monogram in white for dark or photographic backgrounds: a solid front S with the airplane cutout over a
 *  translucent rear S. Same geometry and layering as splashscreen/ss-coral-layered.svg. Decorative (aria-hidden). */
export function SSMark({ className, rearOpacity = 0.45 }: { className?: string; rearOpacity?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <svg className={className} viewBox="420 312 474 296" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <mask id={`${id}-cut`} maskUnits="userSpaceOnUse" x="400" y="300" width="410" height="320">
          <path fill="white" d="M400 300H810V620H400Z" /><path fill="black" d={cutout} />
        </mask>
        <mask id={`${id}-behind`} maskUnits="userSpaceOnUse" x="400" y="300" width="550" height="320">
          <path fill="white" d="M400 300H950V620H400Z" /><path fill="black" d={letter} /><path fill="black" d={cutout} />
        </mask>
      </defs>
      {/* Mask on the untransformed group, as in the original file, so it does not shift with the rear S. */}
      <g mask={`url(#${id}-behind)`}><path d={letter} transform="translate(100 0)" fill="#fff" fillOpacity={rearOpacity} /></g>
      <path d={letter} fill="#fff" mask={`url(#${id}-cut)`} />
    </svg>
  )
}

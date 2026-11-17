import { useId } from 'react'
import { airplane, cutout, letter } from './geometry'
import './loader.css'

/** Loading screen: the SS logo assembling on a loop, on the launch splash's coral, with no wordmark.
 *  The two S's start apart side by side, slide together into the stacked logo, then the plane flies through and leaves
 *  its silhouette cut out of both letters. Same geometry and colours as the launch splash (splashscreen/).
 *  Reduced motion: the finished logo, still. */
export function SSLoader() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const flight = (
    <>
      <path className="ss-loader__plane" d={airplane} fill="black" />
      <path className="ss-loader__cutout" d={cutout} fill="black" />
    </>
  )
  return (
    <div className="ss-loader" role="status" aria-live="polite">
      <span className="sr-only">Loading SkyStop</span>
      <svg className="ss-loader__logo" viewBox="190 270 880 380" aria-hidden="true" focusable="false">
        <defs>
          <mask id={`${id}-front`} maskUnits="userSpaceOnUse" x="0" y="0" width="1400" height="900">
            <rect width="1400" height="900" fill="white" />
            {flight}
          </mask>
          <mask id={`${id}-rear`} maskUnits="userSpaceOnUse" x="0" y="0" width="1400" height="900">
            <rect width="1400" height="900" fill="white" />
            <g className="ss-loader__front">{flight}</g>
          </mask>
        </defs>
        {/* Rear S (soft coral) behind; the flight cuts through it where it crosses the front S */}
        <g mask={`url(#${id}-rear)`}><g className="ss-loader__rear"><path d={letter} fill="#FFB5A5" /></g></g>
        <g className="ss-loader__front"><path d={letter} fill="#FFF5ED" mask={`url(#${id}-front)`} /></g>
      </svg>
    </div>
  )
}

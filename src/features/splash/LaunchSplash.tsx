import { useEffect, useId, useState, type ReactNode } from 'react'
import { airplane, cutout, letter } from './geometry'
import './splash.css'

export function LaunchSplash({ children }: { children: ReactNode }) {
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const id = useId()
  const flightMask = (
    <>
      <path className="launch-splash__plane" d={airplane} fill="black" />
      <path className="launch-splash__cutout" d={cutout} fill="black" />
    </>
  )

  useEffect(() => {
    if (!playing) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finish = () => setPlaying(false)
    const onPreferenceChange = () => { if (preference.matches) finish() }
    preference.addEventListener('change', onPreferenceChange)
    // Keep the application reachable if the animation is interrupted.
    const timeout = window.setTimeout(finish, 1600)
    return () => {
      preference.removeEventListener('change', onPreferenceChange)
      window.clearTimeout(timeout)
    }
  }, [playing])

  return (
    <>
      <div style={{ display: 'contents' }} inert={playing}>{children}</div>
      {playing && (
        <div className="launch-splash" aria-hidden="true" onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setPlaying(false)
        }}>
          <svg className="launch-splash__logo" viewBox="145 90 1024 740" focusable="false">
            <defs>
              <clipPath id={id + '-letters'}>
                <rect x="794" y="270" width="575" height="380" />
              </clipPath>
              <mask id={id + '-front'} maskUnits="userSpaceOnUse" x="0" y="0" width="1400" height="900">
                <rect width="1400" height="900" fill="white" />
                {flightMask}
              </mask>
              <mask id={id + '-rear'} maskUnits="userSpaceOnUse" x="0" y="0" width="1400" height="900">
                <rect width="1400" height="900" fill="white" />
                <g className="launch-splash__upper">{flightMask}</g>
              </mask>
            </defs>
            <g mask={'url(#' + id + '-rear)'}>
              <g className="launch-splash__lower">
                <g clipPath={'url(#' + id + '-letters)'}><text className="launch-splash__letters" x="811" y="573">top</text></g>
                <path d={letter} fill="#FFB5A5" />
              </g>
            </g>
            <g className="launch-splash__upper">
              <g clipPath={'url(#' + id + '-letters)'}><text className="launch-splash__letters" x="811" y="573">ky</text></g>
              <path d={letter} fill="#FFF5ED" mask={'url(#' + id + '-front)'} />
            </g>
          </svg>
        </div>
      )}
    </>
  )
}

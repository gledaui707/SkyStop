import { useEffect, useRef, useState } from 'react'

const SCREEN_W = 390, SCREEN_H = 844, BEZEL = 14

/** Decides how this page is shown: the app itself (phones, tablets, or inside the frame), or the desktop device frame. */
export function presentation(): 'app' | 'frame' {
  const q = new URLSearchParams(window.location.search)
  const embedded = window.self !== window.top || q.get('embedded') === '1'
  if (embedded) { document.documentElement.classList.add('in-device-frame'); return 'app' }
  // Desktop-class browsers only: a fine pointer and room for the device. Real phones always get the app full screen.
  return window.matchMedia('(pointer: fine) and (min-width: 820px) and (min-height: 560px)').matches ? 'frame' : 'app'
}

/** Keep one iframe mounted so changing the preview size preserves the current trip and screen. */
export function DeviceFrame() {
  const [mobile, setMobile] = useState(() => new URLSearchParams(window.location.search).get('frame') !== 'off')
  const [scale, setScale] = useState(1)
  const app = useRef<HTMLIFrameElement>(null)
  // The page around the phone is a dark stage; the app inside the iframe keeps its own light theme.
  useEffect(() => { document.documentElement.classList.add('device-stage'); return () => document.documentElement.classList.remove('device-stage') }, [])
  // The app reports whether the top of its screen is dark (photo) or light, so the clock is white or charcoal.
  const [barTone, setBarTone] = useState<'light' | 'dark'>('light')
  useEffect(() => {
    const on = (e: MessageEvent) => { if (e.source === app.current?.contentWindow && e.data?.type === 'skystop-statusbar') setBarTone(e.data.tone === 'dark' ? 'dark' : 'light') }
    window.addEventListener('message', on); return () => window.removeEventListener('message', on)
  }, [])
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 72) / (SCREEN_H + BEZEL * 2), (window.innerWidth - 32) / (SCREEN_W + BEZEL * 2)))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const syncInsets = () => app.current?.contentDocument?.documentElement.classList.toggle('in-device-frame', mobile)
  useEffect(() => {
    app.current?.contentDocument?.documentElement.classList.toggle('in-device-frame', mobile)
  }, [mobile])

  const q = new URLSearchParams(window.location.search)
  q.set('embedded', '1')
  const src = `${window.location.pathname}?${q.toString()}`
  const outerWidth = SCREEN_W + BEZEL * 2
  const outerHeight = SCREEN_H + BEZEL * 2
  return (
    <div className="flex h-dvh flex-col">
      <div className="flex h-12 shrink-0 items-center justify-center px-4">
        <div role="group" aria-label="Preview size" className="inline-flex gap-0.5 rounded-full border border-white/10 bg-white/[0.06] p-0.5">
          {[{ label: 'Mobile', value: true }, { label: 'Fullscreen', value: false }].map(({ label, value }) => (
            <button key={label} type="button" aria-pressed={mobile === value} onClick={() => setMobile(value)}
              className={`min-h-8 rounded-full px-3 text-cap font-semibold ${mobile === value ? 'bg-white text-[#1f1a17]' : 'text-white/70 hover:bg-white/10'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className={mobile ? 'grid min-h-0 flex-1 items-start justify-items-center pb-4 pt-2' : 'flex min-h-0 flex-1'}>
        <div className="relative" style={mobile ? { width: outerWidth * scale, height: outerHeight * scale } : { width: '100%', height: '100%' }}>
          <div className="absolute left-0 top-0 origin-top-left" style={mobile
            ? { width: outerWidth, height: outerHeight, transform: `scale(${scale})` }
            : { width: '100%', height: '100%' }}>
            {mobile && <div aria-hidden="true" className="absolute inset-0 rounded-[3.6rem] bg-[#0b0706] shadow-[0_30px_80px_rgb(0_0_0/0.6),0_0_120px_-20px_rgb(234_81_57/0.35)] ring-1 ring-white/12" />}
            <div className={mobile ? 'absolute overflow-hidden rounded-[2.85rem] bg-canvas' : 'absolute inset-0'}
              style={mobile ? { left: BEZEL, top: BEZEL, width: SCREEN_W, height: SCREEN_H } : undefined}>
              <iframe ref={app} title="SkyStop app" src={src} onLoad={syncInsets} className="block size-full border-0" />
              {mobile && (
                <>
                  <div aria-hidden="true" className={`pointer-events-none absolute left-8 top-3 text-[0.95rem] font-semibold transition-colors duration-300 ${barTone === 'dark' ? 'text-white' : 'text-[#231a17]'}`}>9:41</div>
                  <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[0.7rem] h-[2.1rem] w-[7.4rem] -translate-x-1/2 rounded-full bg-black" />
                  <div aria-hidden="true" className="pointer-events-none absolute bottom-2 left-1/2 h-[5px] w-[8.5rem] -translate-x-1/2 rounded-full bg-[#1f1a17]/70" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

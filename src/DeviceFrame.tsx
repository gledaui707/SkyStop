import { useEffect, useState } from 'react'

const SCREEN_W = 390, SCREEN_H = 844, BEZEL = 14

/** Decides how this page is shown: the app itself (phones, tablets, or inside the frame), or the desktop device frame. */
export function presentation(): 'app' | 'frame' {
  const q = new URLSearchParams(window.location.search)
  const embedded = window.self !== window.top || q.get('embedded') === '1'
  if (embedded) { document.documentElement.classList.add('in-device-frame'); return 'app' }
  if (q.get('frame') === 'off') return 'app'
  // Desktop-class browsers only: a fine pointer and room for the device. Real phones always get the app full screen.
  return window.matchMedia('(pointer: fine) and (min-width: 820px) and (min-height: 560px)').matches ? 'frame' : 'app'
}

/** Desktop presentation: the same app, loaded at a real iPhone viewport inside a phone silhouette.
 *  Using an iframe keeps fixed navigation, sheets and scrolling exactly as on a device, with one codebase. */
export function DeviceFrame() {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 40) / (SCREEN_H + BEZEL * 2), (window.innerWidth - 40) / (SCREEN_W + BEZEL * 2)))
    fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit)
  }, [])
  const q = new URLSearchParams(window.location.search); q.set('embedded', '1')
  const src = `${window.location.pathname}?${q.toString()}`
  const outerW = (SCREEN_W + BEZEL * 2) * scale, outerH = (SCREEN_H + BEZEL * 2) * scale
  return (
    <div className="mx-auto grid min-h-dvh max-w-5xl grid-cols-1 place-content-center place-items-center gap-6 px-6 py-5 lg:grid-cols-[minmax(0,22rem)_auto] lg:gap-16">
      <section className="hidden max-w-[22rem] lg:block">
        <p className="text-cap font-semibold uppercase tracking-[0.14em] text-accent-dark">SkyStop · interactive prototype</p>
        <h1 className="mt-3 text-[2.5rem] font-bold leading-[1.05] tracking-[-0.03em]">Your layover, reimagined.</h1>
        <p className="mt-4 text-body text-muted-text">This is the live app at an iPhone-sized screen. Everything works here: plan a layover, explore an airport and save a plan. On a phone, SkyStop opens full screen.</p>
        <a href={`${window.location.pathname}?frame=off`} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sub font-semibold text-ink ring-1 ring-line">Open without the device frame</a>
      </section>
      <div style={{ width: outerW, height: outerH }} className="relative">
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: SCREEN_W + BEZEL * 2, height: SCREEN_H + BEZEL * 2, transform: `scale(${scale})` }}>
          {/* phone silhouette */}
          <div aria-hidden="true" className="absolute inset-0 rounded-[3.6rem] bg-[#1b1514] shadow-[0_0_0_2px_#3a302d,0_40px_80px_rgb(70_35_25/0.35),0_12px_24px_rgb(70_35_25/0.25)]" />
          <span aria-hidden="true" className="absolute -left-[3px] top-[7.5rem] h-12 w-[3px] rounded-l bg-[#2c2321]" />
          <span aria-hidden="true" className="absolute -left-[3px] top-[11.5rem] h-20 w-[3px] rounded-l bg-[#2c2321]" />
          <span aria-hidden="true" className="absolute -right-[3px] top-[10rem] h-24 w-[3px] rounded-r bg-[#2c2321]" />
          <div className="absolute overflow-hidden rounded-[2.85rem] bg-canvas" style={{ left: BEZEL, top: BEZEL, width: SCREEN_W, height: SCREEN_H }}>
            <iframe title="SkyStop app" src={src} className="block size-full border-0" />
            {/* status bar + Dynamic Island, drawn over the app's reserved top inset */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 flex h-[3.1rem] items-center justify-between px-8 text-[0.95rem] font-semibold text-white mix-blend-difference">
              <span>9:41</span>
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[0.7rem] h-[2.1rem] w-[7.4rem] -translate-x-1/2 rounded-full bg-black" />
            <div aria-hidden="true" className="pointer-events-none absolute bottom-2 left-1/2 h-[5px] w-[8.5rem] -translate-x-1/2 rounded-full bg-ink/70" />
          </div>
        </div>
      </div>
    </div>
  )
}

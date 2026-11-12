import { Info } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Sheet } from './ui'

/** Small "i" button beside a label. The explanation opens in a bottom sheet only when tapped. */
export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`About ${label}`} aria-haspopup="dialog"
        className="press -my-2 inline-grid size-11 shrink-0 place-items-center rounded-full text-muted-text">
        <Info size={17} />
      </button>
      {open && createPortal(
        <Sheet open onClose={() => setOpen(false)} title={label}>
          <p className="pb-2 text-body text-ink/90">{children}</p>
        </Sheet>, document.body)}
    </>
  )
}

import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRangefinder } from '../../hooks/useRangefinder'
import { parseYardage } from '../../lib/rangefinder'
import { href, useTournamentRoute } from '../../lib/paths'
import './rangefinder.css'

const signed = (n: number, digits = 1) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(digits)

export function Rangefinder({ onClose, context }: { onClose: () => void; context?: string }) {
  const rf = useRangefinder()
  const viewer = useRef<HTMLElement>(null)
  async function pasteYardage() {
    try {
      if (!navigator.clipboard?.readText) throw new Error('Unavailable')
      const yards = parseYardage(await navigator.clipboard.readText())
      if (yards === null) {
        rf.setNotice('Paste one yardage, such as “170” or “170 yd”. Multiple distances are ambiguous.'); return
      }
      rf.changeYardage(String(yards)); rf.setNotice('Pasted yardage. Confirm it matches the target you are sighting.')
    } catch { rf.setNotice('Clipboard access unavailable. Tap the yardage field to paste or type it.') }
  }
  function toggleCalibration() {
    rf.setCalibrating(!rf.calibrating)
    if (!rf.calibrating) viewer.current?.scrollIntoView({ block: 'center' })
  }

  return (
    <div className="rf">
      <header className="rf-header">
        <div><p className="rf-eyebrow">FERDA · SLOPE PROTOTYPE</p><h1>Rangefinder</h1>{context && <p className="rf-context">{context}</p>}</div>
        <button className="rf-close" onClick={onClose} autoFocus aria-label="Close rangefinder">Close</button>
      </header>
      <div className="rf-content">
        <section className="rf-viewer" ref={viewer} aria-label="Target sight">
          <video ref={rf.video} autoPlay muted playsInline aria-label="Live rear camera preview" />
          {!rf.cameraReady && <div className="rf-empty"><strong>Your view of the green</strong><span>Enable the rear camera to aim.</span></div>}
          <div className="rf-aim">{rf.calibrating ? 'Aim at a reference at camera height' : 'Aim at the base of the flagstick'}</div>
          {rf.cameraReady && <div className="rf-reticle" aria-hidden="true"><i /><b /><span /></div>}
          {rf.calibrating && <button className="rf-zero" disabled={!rf.calibrationReady} onClick={rf.saveZero}>Save horizontal zero</button>}
          <div className="rf-view-status"><span className={rf.ready ? 'rf-ready' : ''} role="status">{rf.status}</span><span>{rf.angle === null ? '—°' : signed(rf.angle, 2) + '°'}</span></div>
        </section>
        <div className="rf-buttons"><button onClick={rf.toggleCamera} disabled={rf.cameraBusy}>{rf.cameraBusy ? 'Opening camera…' : rf.hasCamera ? 'Pause camera' : 'Enable camera'}</button><button onClick={rf.toggleMotion} disabled={rf.motionBusy}>{rf.motionBusy ? 'Requesting access…' : rf.hasMotion ? 'Pause motion' : 'Enable motion'}</button></div>
        <p className="rf-notice" role="status">{rf.notice}</p>

        <section className="rf-grint" aria-label="TheGrint yardage companion">
          <div><h2>Using TheGrint?</h2><span className="rf-manual">Manual handoff</span></div>
          <p>Check <strong>unadjusted GPS yardage</strong> in TheGrint, then return here and enter that distance. Ferda adds the elevation measurement.</p>
          <p className="rf-subtle">Live sync is not connected. Returning from another app pauses the camera and motion; enable both again.</p>
          <a href="https://thegrint.com/" target="_blank" rel="noopener noreferrer">TheGrint website</a>
        </section>

        <div className="rf-inputs">
          <label htmlFor="rf-yardage"><span>GPS yardage<small>Unadjusted distance to your target</small></span><span className="rf-input-unit"><input id="rf-yardage" type="number" inputMode="decimal" min="1" max="400" step="1" value={rf.yardage} onChange={e => rf.changeYardage(e.target.value)} /><span>yd</span></span></label>
          <button className="rf-paste" onClick={pasteYardage}>Paste yardage</button>
          <label htmlFor="rf-height"><span>Camera height<small>Lens above your ground</small></span><span className="rf-input-unit"><input id="rf-height" type="number" inputMode="decimal" min="0" max="10" step="0.1" value={rf.height} onChange={e => rf.changeHeight(e.target.value)} /><span>ft</span></span></label>
        </div>

        <section className="rf-result" aria-label="Elevation result">
          <div className="rf-result-top"><span>{rf.captured ? 'CAPTURED ELEVATION' : 'LIVE ELEVATION'}</span><span>{rf.offset === null ? 'Uncalibrated' : 'Calibrated'}</span></div>
          <div className="rf-number">{rf.shown ? signed(rf.shown.feet) : '—'}<span>ft</span></div>
          <p>{rf.shown ? `${Math.abs(rf.shown.feet) < 0.05 ? 'Level' : rf.shown.feet > 0 ? 'Uphill' : 'Downhill'} · ${rf.shown.yards.toFixed(0)} yd · ${signed(rf.shown.angle, 2)}°` : 'Enable camera and motion for a fresh reading.'}</p>
          <button className="rf-primary" disabled={!rf.captured && !rf.ready} onClick={rf.capture}>{rf.captured ? 'Take another reading' : 'Capture elevation'}</button>
        </section>

        <section className="rf-calibration">
          <button className="rf-text-button" aria-expanded={rf.calibrating} aria-controls="rf-calibration-panel" onClick={toggleCalibration}>Calibrate horizontal reference <span>{rf.calibrating ? '−' : '+'}</span></button>
          {rf.calibrating && <div id="rf-calibration-panel"><p>Aim at a point at <strong>exactly the camera’s height</strong>, ideally 30 ft or farther away. Hold still and use Save horizontal zero on the camera view.</p><p className="rf-subtle">Do not zero on the flagstick base: it is below your camera even on level ground.</p><button onClick={rf.clearZero}>Clear calibration</button><p className="rf-subtle">{rf.offset === null ? 'No correction saved.' : `Saved correction: ${signed(rf.offset, 2)}°`}</p></div>}
        </section>
        <details className="rf-help"><summary>Before you trust a reading</summary>
          <p>Keep the phone upright in portrait and aim at a visible ground point. Green-center yardage is approximate when the pin is elsewhere. Sighting flag fabric introduces a height error.</p>
          <p>Test on level ground first using a measured distance and camera height. Aim at ground level: the elevation should be near 0 ft. Tilt the rear camera up: the angle should become positive. Repeat ten readings to check bias and spread.</p>
          <p>Steady means repeatable sensor readings, not proven accuracy. This is ground elevation, not a “plays like” distance. Both camera alignment and Safari sensor precision still need field validation.</p>
          <p>Camera and motion data stay on your phone. No photos, video, or readings are uploaded or added to your scores. Calibration and camera height are stored only in this browser.</p>
        </details>
        <footer>Manual GPS input · Field validation pending</footer>
      </div>
    </div>
  )
}

/** The scorecard stays mounted behind the native modal, preserving optimistic scores. */
export function RangefinderDialog({ onClose, context }: { onClose: () => void; context?: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    dialog.current?.showModal()
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])
  return <dialog ref={dialog} className="rf-dialog" aria-label="Rangefinder" onCancel={onClose}><Rangefinder onClose={onClose} context={context} /></dialog>
}

export function RangefinderPage() {
  const navigate = useNavigate()
  const { base } = useTournamentRoute()
  return <Rangefinder onClose={() => navigate(href(base))} />
}

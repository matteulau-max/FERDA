import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRangefinder } from '../../hooks/useRangefinder'
import { slopeAdjustedYards } from '../../lib/rangefinder'
import { href, useTournamentRoute } from '../../lib/paths'
import './rangefinder.css'
import { GolfGps } from './GolfGps'

const signed = (n: number, digits = 1) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(digits)

export function Rangefinder({ onClose, context }: { onClose: () => void; context?: string }) {
  const rf = useRangefinder()
  const [gps, setGps] = useState<{ yards: number | null; target: string }>({ yards: null, target: '' })
  const [settings, setSettings] = useState(false)
  const onDistanceChange = useCallback((yards: number | null, target: string) => setGps(old => old.yards === yards && old.target === target ? old : { yards, target }), [])
  useEffect(() => { rf.changeYardage(gps.yards === null ? '' : gps.yards.toFixed(1)) }, [gps.yards, gps.target])
  const reading = gps.yards !== null && (rf.captured || rf.ready) ? rf.shown : null
  const adjusted = reading ? slopeAdjustedYards(reading.yards, reading.feet) : null
  function toggleView() {
    if (rf.hasCamera || rf.hasMotion) {
      if (rf.hasCamera) void rf.toggleCamera()
      if (rf.hasMotion) void rf.toggleMotion()
    } else {
      // Request motion within the user gesture, before camera's asynchronous permission flow.
      void rf.toggleMotion(); void rf.toggleCamera()
    }
  }
  let hint = 'Enable GPS, then start the camera.'
  if (gps.yards !== null) hint = gps.yards > 400 ? 'Move within 400 yd for a slope estimate.' : !rf.hasCamera || !rf.hasMotion ? 'Start the camera to measure slope.' : rf.status

  return <div className="rf rf-simple">
    <header className="rf-header"><div><p className="rf-eyebrow">FERDA</p><h1>Rangefinder</h1>{context && <p className="rf-context">{context}</p>}</div><button className="rf-close" onClick={onClose} autoFocus aria-label="Close rangefinder">Close</button></header>
    <div className="rf-content">
      <GolfGps onDistanceChange={onDistanceChange} />
      <section className="rf-viewer" aria-label="Slope camera">
        <video ref={rf.video} autoPlay muted playsInline aria-label="Live rear camera preview" />
        {!rf.cameraReady && <div className="rf-empty"><strong>Sight the green</strong><span>Start camera to measure slope</span></div>}
        <div className="rf-aim">Aim at the middle of the green · ground level</div>
        {rf.cameraReady && <div className="rf-reticle" aria-hidden="true"><i /><b /><span /></div>}
        <div className="rf-view-status"><span role="status">{hint}</span>{rf.angle !== null && <span>{signed(rf.angle, 1)}°</span>}</div>
      </section>
      <button className="rf-primary rf-start" disabled={rf.cameraBusy || rf.motionBusy} onClick={toggleView}>{rf.cameraBusy || rf.motionBusy ? 'Requesting access…' : rf.hasCamera || rf.hasMotion ? 'Pause camera' : 'Start camera & slope'}</button>
      <section className="rf-result" aria-label="Slope-adjusted distance">
        <div className="rf-result-top"><span>SLOPE-ADJUSTED MIDDLE</span><span>Estimate</span></div>
        <div className="rf-number">{adjusted === null ? '—' : Math.round(adjusted)}<span>yd</span></div>
        <p>{reading ? `${signed(reading.feet, 0)} ft elevation · ${Math.round(reading.yards)} yd actual` : hint}</p>
        <button disabled={!rf.captured && (!rf.ready || gps.yards === null)} onClick={rf.capture}>{rf.captured ? 'Resume live reading' : 'Hold reading'}</button>
      </section>
      <section className="rf-settings">
        <button className="rf-text-button" aria-expanded={settings} aria-controls="rf-settings-panel" onClick={() => setSettings(!settings)}>Settings & help <span>{settings ? '−' : '+'}</span></button>
        {settings && <div id="rf-settings-panel">
          <p role="status">{rf.notice}</p>
          <div className="rf-inputs"><label htmlFor="rf-height"><span>Camera height<small>Lens above the ground</small></span><span className="rf-input-unit"><input id="rf-height" type="number" inputMode="decimal" min="0" max="10" step="0.1" value={rf.height} onChange={e => rf.changeHeight(e.target.value)} /><span>ft</span></span></label></div>
          <p>Horizontal is determined automatically from your phone’s orientation sensors using gravity. No manual calibration is needed. Hold the phone upright and steady before holding a reading.</p>
          <p>Select each hole manually. GPS updates while Ferda is open. After switching apps, enable GPS and camera again.</p>
          <p>For slope, aim at the middle of the green at ground level—not the flag if it is elsewhere. Front/back follow your approach through the mapped middle.</p>
          <p>The adjusted distance is an experimental estimate using an ideal 45° projectile model. It does not account for club trajectory, ball lift or drag, wind, or roll. Camera, phone GPS, and mapping accuracy need field testing.</p>
          <p>Compare middle yardage with TheGrint or 18Birdies from the same spot. Test elevation on measured level ground first. Positions and camera data stay on your phone; camera height is saved in this browser.</p>
          <p>Map data: © OpenStreetMap contributors via OpenGolfAPI, ODbL 1.0. Bundled maps cover all 18 holes at Dyker Beach and Patriot Hills.</p>
        </div>}
      </section>
    </div>
  </div>
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

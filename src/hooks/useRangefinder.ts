import { useCallback, useEffect, useRef, useState } from 'react'
import { cameraAngle, elevation, windowStats, type AngleSample, type ElevationReading } from '../lib/rangefinder'

const HEIGHT_KEY = 'ferda.rangefinder.cameraHeight.v1'
function savedHeight() {
  try {
    const text = localStorage.getItem(HEIGHT_KEY)
    const height = text === null ? NaN : Number(text)
    if (Number.isFinite(height) && height >= 0 && height <= 10) return String(height)
  } catch { /* Optional browser storage. */ }
  return '5'
}
function isPortrait() {
  const legacy = (window as Window & { orientation?: number }).orientation
  const angle = window.screen.orientation?.angle ?? legacy
  return typeof angle === 'number' ? angle === 0 : window.innerHeight >= window.innerWidth
}

export function useRangefinder() {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const samples = useRef<AngleSample[]>([])
  const motion = useRef(false)
  const generation = useRef(0)
  const mounted = useRef(true)
  const [now, setNow] = useState(() => performance.now())
  const [cameraBusy, setCameraBusy] = useState(false)
  const [motionBusy, setMotionBusy] = useState(false)
  const [yardage, setYardage] = useState('170')
  const [height, setHeight] = useState(savedHeight)
  const [captured, setCaptured] = useState<ElevationReading | null>(null)
  const [notice, setNotice] = useState('Open in Safari and allow camera and motion when prompted.')

  const stopCamera = useCallback(() => {
    generation.current++
    stream.current?.getTracks().forEach(track => track.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
  }, [])

  useEffect(() => {
    mounted.current = true
    const tick = setInterval(() => setNow(performance.now()), 150)
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (!motion.current || document.hidden) return
      const angle = cameraAngle(event.beta, event.gamma)
      if (angle === null) { samples.current = []; return }
      const time = performance.now()
      samples.current = [...samples.current.filter(s => time - s.time <= 700), { time, angle }]
    }
    const pause = () => {
      stopCamera(); motion.current = false; samples.current = []
      setCaptured(null); setNow(performance.now())
      setNotice('Paused. Enable camera and motion to resume.')
    }
    const onVisibility = () => { if (document.hidden) pause() }
    const onRotation = () => { samples.current = []; setCaptured(null); setNow(performance.now()) }
    window.addEventListener('deviceorientation', onOrientation)
    window.addEventListener('orientationchange', onRotation)
    window.addEventListener('pagehide', pause)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      mounted.current = false
      clearInterval(tick); stopCamera(); motion.current = false; samples.current = []
      window.removeEventListener('deviceorientation', onOrientation)
      window.removeEventListener('orientationchange', onRotation)
      window.removeEventListener('pagehide', pause)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [stopCamera])

  async function toggleCamera() {
    if (stream.current) { stopCamera(); setCaptured(null); setNotice('Camera paused.'); return }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setNotice('Camera access needs a secure page. Open Ferda directly in Safari.'); return
    }
    const version = ++generation.current
    setCameraBusy(true)
    try {
      const next = await navigator.mediaDevices.getUserMedia({ audio: false,
        video: { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } })
      if (!mounted.current || document.hidden || version !== generation.current) {
        next.getTracks().forEach(track => track.stop()); return
      }
      stream.current = next
      if (!video.current) { stopCamera(); return }
      video.current.srcObject = next
      next.getVideoTracks()[0].addEventListener('ended', () => {
        if (mounted.current && stream.current === next) {
          stopCamera(); setCaptured(null); setNotice('Camera stopped. Enable camera to retry.')
        }
      })
      await video.current.play()
      if (mounted.current && version === generation.current) setNotice('Rear camera ready. Aim at the target ground.')
    } catch {
      if (mounted.current && version === generation.current) {
        stopCamera(); setNotice('Rear camera unavailable or access blocked. Allow access in Safari and retry.')
      }
    } finally { if (mounted.current) setCameraBusy(false) }
  }

  async function toggleMotion() {
    if (motion.current) {
      motion.current = false; samples.current = []; setCaptured(null); setNotice('Motion paused.'); return
    }
    if (!window.isSecureContext || typeof DeviceOrientationEvent === 'undefined') {
      setNotice('Motion sensors unavailable. Open Ferda directly in Safari on your iPhone.'); return
    }
    const Orientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<string>
    }
    setMotionBusy(true)
    try {
      // Call directly from the button tap, before any unrelated async operation.
      const permission = Orientation.requestPermission ? await Orientation.requestPermission() : 'granted'
      if (!mounted.current || document.hidden) return
      if (permission !== 'granted') throw new Error('Denied')
      motion.current = true; samples.current = []; setCaptured(null)
      setNotice('Motion enabled. Hold the phone upright and steady.')
    } catch { if (mounted.current) setNotice('Motion access blocked. Reload in Safari, tap Enable motion and allow access.') }
    finally { if (mounted.current) setMotionBusy(false) }
  }

  const stats = windowStats(samples.current, now)
  const angle = stats.mean
  const distance = yardage.trim() === '' ? NaN : Number(yardage)
  const cameraHeight = height.trim() === '' ? NaN : Number(height)
  const reading = angle === null ? null : elevation(distance, angle, cameraHeight)
  const track = stream.current?.getVideoTracks()[0]
  const cameraReady = Boolean(track && track.readyState === 'live' && !track.muted
    && video.current && !video.current.paused && video.current.readyState >= 2)
  const portrait = isPortrait()
  const ready = motion.current && stats.fresh && stats.stable && cameraReady && portrait && Boolean(reading)
  function changeYardage(value: string) { setYardage(value); setCaptured(null) }
  function changeHeight(value: string) {
    setHeight(value); setCaptured(null)
    const n = value.trim() === '' ? NaN : Number(value)
    if (Number.isFinite(n) && n >= 0 && n <= 10) {
      try { localStorage.setItem(HEIGHT_KEY, value) } catch { /* Session only. */ }
    }
  }
  function capture() {
    if (captured) { setCaptured(null); return }
    // Recheck freshness at the actual click time, not the last render.
    const live = windowStats(samples.current, performance.now())
    const currentTrack = stream.current?.getVideoTracks()[0]
    if (ready && currentTrack?.readyState === 'live' && !currentTrack.muted
      && video.current && !video.current.paused && isPortrait()
      && live.fresh && live.stable && live.mean !== null) {
      setCaptured(elevation(distance, live.mean, cameraHeight))
    }
  }
  let status = 'Motion is off'
  if (motion.current && !portrait) status = 'Hold phone upright in portrait'
  else if (motion.current && !stats.fresh) status = 'Waiting for motion data · retry in Safari if needed'
  else if (motion.current && !reading) status = 'Check yardage / height; aim near horizontal'
  else if (motion.current && !stats.stable) status = 'Hold still'
  else if (motion.current && !cameraReady) status = 'Motion steady · enable camera'
  else if (ready) status = 'Gravity reference · steady'

  return { video, yardage, height, changeYardage, changeHeight, cameraReady, cameraBusy,
    hasCamera: Boolean(stream.current), hasMotion: motion.current, motionBusy, toggleCamera, toggleMotion,
    angle: stats.fresh && motion.current ? angle : null, ready, captured,
    shown: captured ?? (motion.current && stats.fresh && portrait ? reading : null), capture,
    status, notice, setNotice }
}

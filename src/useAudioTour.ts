import { useEffect, useRef, useState } from 'react'
import { AUDIO_TOUR_STOPS, type AudioTourStop } from './audioTourData'
import { NARRATION_AUDIO } from './audioTourAssets'
import { TourSoundtrack } from './tourSoundtrack'
import type { GuidedVisit } from './types'

export type TourPhase = 'idle' | 'travelling' | 'playing' | 'paused' | 'error' | 'complete'
type TourState = {
  phase: TourPhase
  index: number
  elapsed: number
  duration: number
  message: string
  visit: GuidedVisit | null
}
const INITIAL: TourState = { phase: 'idle', index: 0, elapsed: 0, duration: 0, message: '', visit: null }

export function useAudioTour(onVisit: (stop: AudioTourStop) => void) {
  const [state, setState] = useState<TourState>(INITIAL)
  const current = useRef(state)
  const [open, setOpen] = useState(false)
  const [music, setMusic] = useState(true)
  const [musicVolume, setMusicVolume] = useState(.35)
  const [voiceVolume, setVoiceVolume] = useState(1)
  const [rate, setRate] = useState(1)
  const [motion, setMotion] = useState(true)
  const [manualCamera, setManualCamera] = useState(false)
  const manualCameraRef = useRef(false)
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [musicError, setMusicError] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)
  const soundtrack = useRef<TourSoundtrack | null>(null)
  const sequence = useRef(0)
  const preparation = useRef<{ id: number; ready: boolean; arrived: boolean; offset: number; starting: boolean } | null>(null)
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null)
  const visitCallback = useRef(onVisit)
  visitCallback.current = onVisit
  const settings = useRef({ music, musicVolume, voiceVolume, rate })
  settings.current = { music, musicVolume, voiceVolume, rate }

  function commit(next: TourState) {
    current.current = next
    setState(next)
  }

  function clearDeadline() {
    if (deadline.current !== null) clearTimeout(deadline.current)
    deadline.current = null
  }

  function fail(message: string) {
    ++sequence.current
    preparation.current = null
    clearDeadline()
    audioRef.current?.pause()
    soundtrack.current?.pause()
    commit({ ...current.current, phase: 'error', message, visit: null })
  }

  function startMusic(stop: AudioTourStop) {
    if (!settings.current.music) return
    soundtrack.current ??= new TourSoundtrack()
    setMusicError('')
    void soundtrack.current.start(stop.atmosphere, settings.current.musicVolume).catch((error: unknown) => {
      setMusicError(`Music unavailable: ${error instanceof Error ? error.message : 'Your browser could not start the soundtrack.'}`)
    })
  }

  function beginNarration() {
    const pending = preparation.current
    const audio = audioRef.current
    if (!audio || !pending || pending.id !== sequence.current || !pending.ready || !pending.arrived || pending.starting) return
    if (current.current.phase !== 'travelling' && current.current.phase !== 'paused') return
    pending.starting = true
    clearDeadline()
    audio.currentTime = Math.min(pending.offset, Math.max(0, audio.duration - .02))
    audio.muted = false
    audio.volume = settings.current.voiceVolume
    audio.playbackRate = settings.current.rate
    void audio.play().then(() => {
      if (pending.id !== sequence.current) return
      commit({ ...current.current, phase: 'playing', message: '' })
    }).catch((error: unknown) => {
      if (pending.id !== sequence.current) return
      pending.starting = false
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        soundtrack.current?.pause()
        commit({ ...current.current, phase: 'paused', message: 'Your browser needs a tap. Press Play to begin the narration.' })
      } else fail(`Narration could not play. ${error instanceof Error ? error.message : 'Please retry this stop.'}`)
    })
  }

  function start(index: number, offset = 0, closeGuide = true) {
    const stop = AUDIO_TOUR_STOPS[index]
    const audio = audioRef.current
    if (!stop || !audio) { fail('That tour stop is not available.'); return }
    const asset = NARRATION_AUDIO[stop.id]
    if (!asset) { fail('The narration for this stop is missing. The transcript is still available.'); return }
    const id = ++sequence.current
    manualCameraRef.current = false
    setManualCamera(false)
    clearDeadline()
    const pending = { id, ready: false, arrived: false, offset, starting: false }
    preparation.current = pending
    const visit: GuidedVisit = { requestId: id, year: stop.year, target: stop.target }
    commit({ phase: 'travelling', index, elapsed: offset, duration: asset.duration, message: '', visit })
    if (closeGuide) setOpen(false)
    audio.pause()
    audio.muted = true
    audio.src = new URL(asset.src, document.baseURI).href
    audio.dataset.stopId = stop.id
    audio.load()
    // The first play is initiated by the user's gesture. Keep it silent until arrival.
    void audio.play().then(() => {
      if (id !== sequence.current) return
      audio.pause()
      pending.ready = true
      beginNarration()
    }).catch((error: unknown) => {
      if (id !== sequence.current) return
      fail(`The narration could not load. ${error instanceof Error ? error.message : 'Please retry.'} Offline playback needs the narration folder alongside the HTML file.`)
    })
    startMusic(stop)
    visitCallback.current(stop)
    deadline.current = setTimeout(() => {
      if (id === sequence.current && current.current.phase === 'travelling') fail('This stop did not finish loading. Retry it, or choose another chapter.')
    }, 60_000)
  }

  function arrive(requestId: number) {
    const pending = preparation.current
    if (!pending || pending.id !== requestId || requestId !== sequence.current) return
    pending.arrived = true
    beginNarration()
  }

  function pause(message = '') {
    const previous = current.current
    if (previous.phase !== 'playing' && previous.phase !== 'travelling') return
    const elapsed = previous.phase === 'playing' ? audioRef.current?.currentTime ?? previous.elapsed : previous.elapsed
    ++sequence.current
    preparation.current = null
    clearDeadline()
    audioRef.current?.pause()
    soundtrack.current?.pause()
    commit({ ...previous, phase: 'paused', elapsed, message, visit: null })
  }

  function resume() {
    if (current.current.phase === 'paused' && preparation.current?.arrived) {
      startMusic(AUDIO_TOUR_STOPS[current.current.index])
      beginNarration()
    } else start(current.current.index, current.current.elapsed)
  }

  function exploreCamera() {
    if (current.current.phase === 'travelling') {
      pause('Travel paused. Resume to return to the guided stop.')
      return
    }
    if (current.current.phase !== 'playing' || manualCameraRef.current) return
    manualCameraRef.current = true
    setManualCamera(true)
    commit({ ...current.current, message: 'Camera under your control. Narration continues.' })
  }

  function stop() {
    ++sequence.current
    preparation.current = null
    clearDeadline()
    audioRef.current?.pause()
    soundtrack.current?.pause()
    commit({ ...current.current, phase: 'idle', message: '', visit: null })
  }

  function ended() {
    if (current.current.phase !== 'playing' || !audioRef.current?.ended) return
    if (current.current.index + 1 < AUDIO_TOUR_STOPS.length) start(current.current.index + 1, 0, false)
    else {
      clearDeadline()
      preparation.current = null
      soundtrack.current?.pause()
      commit({ ...current.current, phase: 'complete', elapsed: current.current.duration, message: 'Five centuries explored. The city is yours to discover.', visit: null })
    }
  }

  function seek(value: number) {
    if (!Number.isFinite(value)) return
    const elapsed = Math.max(0, Math.min(current.current.duration, value))
    if (audioRef.current && Number.isFinite(audioRef.current.duration)) audioRef.current.currentTime = elapsed
    if (preparation.current) preparation.current.offset = elapsed
    commit({ ...current.current, elapsed })
  }

  function toggleMusic(value: boolean) {
    settings.current.music = value
    setMusic(value)
    if (!value) soundtrack.current?.pause()
    else if (current.current.phase === 'playing' || current.current.phase === 'travelling') startMusic(AUDIO_TOUR_STOPS[current.current.index])
  }

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const visibility = () => { if (document.hidden) pause('Paused while the atlas is in the background.') }
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [])

  useEffect(() => () => {
    ++sequence.current
    clearDeadline()
    audioRef.current?.pause()
    if (soundtrack.current) void soundtrack.current.dispose().catch((error: unknown) => console.error('Could not release the tour soundtrack', error))
  }, [])

  return {
    state, stopData: AUDIO_TOUR_STOPS[state.index], open, setOpen, audioRef,
    music, musicVolume, voiceVolume, rate, motion, reducedMotion, musicError,
    cinematic: state.phase === 'playing' && motion && !reducedMotion && !manualCamera,
    active: state.phase !== 'idle',
    start, pause, resume, stop, arrive, fail, ended, seek, exploreCamera,
    pauseForExploration: () => pause('Paused for free exploration. Resume whenever you like.'),
    onTimeUpdate: () => {
      const audio = audioRef.current
      if (audio && current.current.phase === 'playing') commit({ ...current.current, elapsed: audio.currentTime, duration: audio.duration })
    },
    onAudioError: () => {
      if (['travelling', 'playing'].includes(current.current.phase)) fail('Narration could not be loaded. Retry, or read the transcript. The offline edition needs its narration folder.')
    },
    setMusic: toggleMusic,
    setMusicVolume: (value: number) => { setMusicVolume(value); settings.current.musicVolume = value; soundtrack.current?.setVolume(value) },
    setVoiceVolume: (value: number) => { setVoiceVolume(value); settings.current.voiceVolume = value; if (audioRef.current) audioRef.current.volume = value },
    setRate: (value: number) => { setRate(value); settings.current.rate = value; if (audioRef.current) audioRef.current.playbackRate = value },
    setMotion: (value: boolean) => {
      setMotion(value)
      if (value) {
        manualCameraRef.current = false
        setManualCamera(false)
        if (current.current.phase === 'playing') commit({ ...current.current, message: '' })
      }
    },
  }
}

export type AudioTourController = ReturnType<typeof useAudioTour>

import { useEffect, useRef } from 'react'
import { AUDIO_TOUR_STOPS } from './audioTourData'
import { NARRATION_AUDIO } from './audioTourAssets'
import { ERAS, SOURCES } from './data'
import type { AudioTourController } from './useAudioTour'
import './AudioTourPlayer.css'

function time(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00'
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

export default function AudioTourPlayer({ tour }: { tour: AudioTourController }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { state, stopData } = tour
  const running = state.phase === 'playing' || state.phase === 'travelling'
  const duration = AUDIO_TOUR_STOPS.reduce((total, stop) => total + (NARRATION_AUDIO[stop.id]?.duration ?? 0), 0)
  useEffect(() => {
    if (tour.open && !dialog.current?.open) dialog.current?.showModal()
    else if (!tour.open) dialog.current?.close()
  }, [tour.open])

  return <>
    <audio ref={tour.audioRef} preload="none" onEnded={tour.ended} onTimeUpdate={tour.onTimeUpdate}
      onError={tour.onAudioError} data-testid="tour-narration" />
    {tour.active && <section className="audio-tour-bar" aria-label="Audio tour player" data-phase={state.phase} data-stop={stopData.id}>
      <div className="audio-tour-now">
        <span className="eyebrow">{state.phase === 'travelling' ? 'Travelling to' : state.phase === 'complete' ? 'Journey complete' : 'The city, narrated'} · {state.index + 1}/16</span>
        <strong>{stopData.year} · {stopData.title}</strong>
        {state.message && <span className="audio-tour-message" role="status">{state.message}</span>}
      </div>
      <div className="audio-tour-transport">
        <button className="icon-button" aria-label="Previous audio stop" disabled={state.index === 0} onClick={() => tour.start(state.index - 1)}>‹</button>
        <button className="primary-button audio-tour-play" aria-label={running ? 'Pause audio tour' : 'Play audio tour'}
          onClick={() => running ? tour.pause() : state.phase === 'complete' ? tour.start(0) : tour.resume()}>{running ? 'Pause' : state.phase === 'error' ? 'Retry' : 'Play'}</button>
        <button className="icon-button" aria-label="Next audio stop" disabled={state.index + 1 === AUDIO_TOUR_STOPS.length} onClick={() => tour.start(state.index + 1)}>›</button>
      </div>
      <label className="audio-tour-seek"><span className="sr-only">Narration position</span>
        <input type="range" min="0" max={Math.max(1, state.duration)} step=".1" value={state.elapsed}
          disabled={state.phase === 'travelling' || state.phase === 'error'} onChange={(event) => tour.seek(Number(event.target.value))} />
        <span>{time(state.elapsed)} / {time(state.duration)}</span>
      </label>
      <button className="quiet-button audio-tour-details" onClick={() => tour.setOpen(true)}>Transcript & settings</button>
      <button className="icon-button" aria-label="Stop audio tour" onClick={tour.stop}>×</button>
    </section>}
    <dialog ref={dialog} className="audio-tour-dialog" aria-label="Guided audio tour" onCancel={() => tour.setOpen(false)} onClose={() => tour.setOpen(false)}>
      <div className="audio-tour-heading">
        <div><span className="eyebrow">An original city documentary</span><h2>Listen. Look. Travel through time.</h2></div>
        <button className="icon-button" aria-label="Close audio tour guide" onClick={() => tour.setOpen(false)}>×</button>
      </div>
      <p className="audio-tour-intro">Eight chapters. Sixteen stops. {time(duration)} of original narration, with a consistent male guide and an original ambient score. The city moves with the story.</p>
      <div className="audio-tour-start">
        <button className="primary-button" onClick={() => tour.start(0)}>Start full audio tour</button>
        <span>Opt-in only. The timeline stays yours to explore.</span>
      </div>
      <div className="audio-tour-settings">
        <label><span>Narration speed</span><select value={tour.rate} onChange={(event) => tour.setRate(Number(event.target.value))}>
          <option value=".85">0.85× · unhurried</option><option value="1">1× · documentary</option><option value="1.15">1.15×</option><option value="1.3">1.3×</option>
        </select></label>
        <label><span>Voice volume</span><input type="range" min="0" max="1" step=".05" value={tour.voiceVolume} onChange={(event) => tour.setVoiceVolume(Number(event.target.value))} /></label>
        <label className="audio-tour-check"><input type="checkbox" checked={tour.music} onChange={(event) => tour.setMusic(event.target.checked)} />Background music</label>
        <label><span>Music volume</span><input type="range" min="0" max="1" step=".05" value={tour.musicVolume} disabled={!tour.music} onChange={(event) => tour.setMusicVolume(Number(event.target.value))} /></label>
        <label className="audio-tour-check"><input type="checkbox" checked={tour.motion && !tour.reducedMotion} disabled={tour.reducedMotion} onChange={(event) => tour.setMotion(event.target.checked)} />Cinematic camera motion</label>
        {tour.reducedMotion && <small>Your reduced-motion preference is respected.</small>}
      </div>
      {tour.musicError && <p role="alert" className="audio-tour-error">{tour.musicError}</p>}
      <div className="audio-tour-content">
        <div className="audio-tour-chapters">
          <h3>Choose a chapter</h3>
          {ERAS.map((era) => <div className="audio-tour-chapter" key={era.year}>
            <span className="eyebrow">{era.year} · {era.label}</span>
            {AUDIO_TOUR_STOPS.map((stop, index) => stop.year === era.year && <button key={stop.id}
              className={index === state.index && tour.active ? 'audio-tour-stop is-current' : 'audio-tour-stop'}
              aria-label={`Start audio stop: ${stop.title}`} onClick={() => tour.start(index)}>
              <span><strong>{stop.title}</strong><small>{stop.subtitle}</small></span><span>{time(NARRATION_AUDIO[stop.id]?.duration ?? 0)} →</span>
            </button>)}
          </div>)}
        </div>
        <article className="audio-tour-transcript" aria-label="Current narration transcript">
          <span className="eyebrow">{stopData.year} · Transcript</span>
          <h3>{stopData.title}</h3>
          {stopData.narration.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          <h4>Follow the evidence</h4>
          {SOURCES.filter((source) => stopData.sources.includes(source.id)).map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}
          <p className="audio-tour-disclosure">Original synthetic narration, not a celebrity recording. Music and scene animations are illustrative—not historical recordings. The early city is reconstructed; 2025 uses current geographic data. Audio requires the included narration files; transcripts remain available without playback.</p>
        </article>
      </div>
    </dialog>
  </>
}

import type { TourAtmosphere } from './audioTourData'

type ScoreSettings = {
  readonly root: number
  readonly padIntervals: readonly [number, number, number]
  readonly pluckIntervals: readonly number[]
  readonly cutoff: number
  readonly textureCutoff: number
  readonly textureGain: number
  readonly pluckEvery: number
  readonly pluckDecay: number
}

// An original harmonic palette, not a reconstruction of historical music.
export const SCORE_SETTINGS = {
  fort: { root: 50, padIntervals: [0, 7, 14], pluckIntervals: [0, 7, 14, 19, 24], cutoff: 660, textureCutoff: 800, textureGain: .006, pluckEvery: 6.8, pluckDecay: 3.4 },
  bazaar: { root: 50, padIntervals: [0, 7, 17], pluckIntervals: [0, 7, 12, 17, 24], cutoff: 940, textureCutoff: 1500, textureGain: .008, pluckEvery: 3.6, pluckDecay: 2.6 },
  river: { root: 52, padIntervals: [0, 7, 14], pluckIntervals: [0, 7, 14, 19, 26], cutoff: 740, textureCutoff: 1100, textureGain: .011, pluckEvery: 7.4, pluckDecay: 4.2 },
  palace: { root: 50, padIntervals: [0, 9, 16], pluckIntervals: [0, 9, 16, 19, 24], cutoff: 1080, textureCutoff: 1300, textureGain: .005, pluckEvery: 5.2, pluckDecay: 3.8 },
  campus: { root: 55, padIntervals: [0, 7, 14], pluckIntervals: [0, 7, 12, 14, 21], cutoff: 900, textureCutoff: 1600, textureGain: .006, pluckEvery: 5.8, pluckDecay: 3.4 },
  modern: { root: 52, padIntervals: [0, 7, 16], pluckIntervals: [0, 7, 12, 16, 26], cutoff: 1120, textureCutoff: 1800, textureGain: .007, pluckEvery: 4.6, pluckDecay: 3.0 },
} as const satisfies Record<TourAtmosphere, ScoreSettings>

export const MAX_MUSIC_GAIN = .4
const FADE_SECONDS = .12
const PAD_GAINS = [.12, .075, .045] as const
const midiFrequency = (note: number) => 440 * 2 ** ((note - 69) / 12)

export function musicGain(volume: number): number {
  if (!Number.isFinite(volume)) throw new RangeError('Music volume must be a finite number')
  return Math.max(0, Math.min(1, volume)) * MAX_MUSIC_GAIN
}

type Pluck = { oscillator: OscillatorNode; envelope: GainNode }
type ScoreGraph = {
  master: GainNode
  filter: BiquadFilterNode
  pads: OscillatorNode[]
  texture: AudioBufferSourceNode
  textureFilter: BiquadFilterNode
  textureGain: GainNode
  nodes: AudioNode[]
}

function ramp(parameter: AudioParam, value: number, now: number, duration = FADE_SECONDS) {
  parameter.cancelAndHoldAtTime(now)
  parameter.linearRampToValueAtTime(value, now + duration)
}

export class TourSoundtrack {
  private context: AudioContext | null = null
  private graph: ScoreGraph | null = null
  private atmosphere: TourAtmosphere = 'fort'
  private volume = 0
  private active = false
  private wantsPlayback = false
  private disposed = false
  private generation = 0
  private step = 0
  private nextPluck = 0
  private interval: ReturnType<typeof setInterval> | null = null
  private pauseTimer: ReturnType<typeof setTimeout> | null = null
  private suspension: Promise<void> | null = null
  private disposal: Promise<void> | null = null
  private plucks = new Set<Pluck>()

  async start(atmosphere: TourAtmosphere, volume: number): Promise<void> {
    if (this.disposed) throw new Error('This soundtrack has been disposed')
    this.setAtmosphere(atmosphere)
    this.setVolume(volume)
    this.wantsPlayback = true
    if (this.active && this.context?.state === 'running') return
    const generation = ++this.generation
    this.clearPauseTimer()
    this.clearInterval()
    if (!this.context) {
      if (typeof AudioContext === 'undefined') throw new Error('Web Audio is not supported in this browser')
      this.context = new AudioContext()
      try {
        this.graph = this.createGraph(this.context)
      } catch (error) {
        await this.dispose()
        throw error
      }
    }
    const context = this.context
    try {
      // A prior fade may already have requested suspend. Finish that operation
      // before resuming, so an old pause cannot suspend a newly started chapter.
      if (this.suspension) await this.suspension
      if (generation !== this.generation || this.disposed) return
      await context.resume()
      if (generation !== this.generation || this.disposed) {
        if (!this.wantsPlayback && !this.disposed) this.pause()
        return
      }
      if (context.state !== 'running') throw new Error('The browser did not allow the soundtrack to start')
      this.active = true
      this.applyAtmosphere()
      ramp(this.graph!.master.gain, musicGain(this.volume), context.currentTime, .8)
      this.nextPluck = context.currentTime + 1.6
      this.interval = setInterval(() => {
        if (!this.active || generation !== this.generation || context.state !== 'running') return
        if (context.currentTime + .08 >= this.nextPluck) {
          this.playPluck(context.currentTime + .04)
          const spacing = SCORE_SETTINGS[this.atmosphere].pluckEvery
          this.nextPluck = context.currentTime + spacing * (.88 + (this.step % 5) * .06)
        }
      }, 400)
    } catch (error) {
      if (generation === this.generation) this.pause()
      throw error
    }
  }

  pause(): void {
    ++this.generation
    this.active = false
    this.wantsPlayback = false
    this.clearInterval()
    this.clearPauseTimer()
    const context = this.context
    const graph = this.graph
    if (!context || !graph || this.disposed) return
    ramp(graph.master.gain, 0, context.currentTime)
    for (const pluck of this.plucks) {
      ramp(pluck.envelope.gain, 0, context.currentTime)
      pluck.oscillator.stop(context.currentTime + FADE_SECONDS)
    }
    const generation = this.generation
    this.pauseTimer = setTimeout(() => {
      this.pauseTimer = null
      if (generation !== this.generation || this.active || this.disposed || context.state === 'closed') return
      const suspension = context.suspend()
      this.suspension = suspension
      void suspension.then(() => {
        if (this.suspension === suspension) this.suspension = null
      }, (error: unknown) => {
        if (this.suspension === suspension) this.suspension = null
        console.error('Could not suspend the tour soundtrack; its output remains muted.', error)
      })
    }, (FADE_SECONDS + .04) * 1000)
  }

  setVolume(volume: number): void {
    const gain = musicGain(volume)
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.graph && this.context && this.active) {
      ramp(this.graph.master.gain, gain, this.context.currentTime)
    }
  }

  setAtmosphere(atmosphere: TourAtmosphere): void {
    if (!Object.hasOwn(SCORE_SETTINGS, atmosphere)) throw new RangeError('Unknown tour atmosphere')
    this.atmosphere = atmosphere
    this.applyAtmosphere()
  }

  dispose(): Promise<void> {
    if (this.disposal) return this.disposal
    this.disposed = true
    this.active = false
    this.wantsPlayback = false
    ++this.generation
    this.clearInterval()
    this.clearPauseTimer()
    const context = this.context
    const graph = this.graph
    this.graph = null
    this.context = null
    this.disposal = (async () => {
      if (context?.state === 'running' && graph) {
        ramp(graph.master.gain, 0, context.currentTime)
        await new Promise<void>((resolve) => setTimeout(resolve, (FADE_SECONDS + .04) * 1000))
      }
      for (const pluck of this.plucks) {
        pluck.oscillator.onended = null
        pluck.oscillator.stop()
        pluck.oscillator.disconnect()
        pluck.envelope.disconnect()
      }
      this.plucks.clear()
      if (graph) {
        for (const pad of graph.pads) pad.stop()
        graph.texture.stop()
        for (const node of graph.nodes) node.disconnect()
      }
      if (context && context.state !== 'closed') await context.close()
    })()
    return this.disposal
  }

  private createGraph(context: AudioContext): ScoreGraph {
    const master = context.createGain()
    master.gain.value = 0
    master.connect(context.destination)
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = .45
    filter.connect(master)
    const nodes: AudioNode[] = [master, filter]
    const settings = SCORE_SETTINGS[this.atmosphere]
    filter.frequency.value = settings.cutoff
    const pads = PAD_GAINS.map((level, index) => {
      const pad = context.createOscillator()
      pad.type = 'sine'
      pad.frequency.value = midiFrequency(settings.root + settings.padIntervals[index])
      pad.detune.value = (index - 1) * 3
      const envelope = context.createGain()
      envelope.gain.value = level
      pad.connect(envelope)
      envelope.connect(filter)
      nodes.push(pad, envelope)
      pad.start()
      return pad
    })
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
    const data = buffer.getChannelData(0)
    let seed = 20250907
    for (let index = 0; index < data.length; index++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      data[index] = seed / 0x80000000 - 1
    }
    const texture = context.createBufferSource()
    texture.buffer = buffer
    texture.loop = true
    const textureFilter = context.createBiquadFilter()
    textureFilter.type = 'bandpass'
    textureFilter.Q.value = .4
    textureFilter.frequency.value = settings.textureCutoff
    const textureGain = context.createGain()
    textureGain.gain.value = settings.textureGain
    texture.connect(textureFilter)
    textureFilter.connect(textureGain)
    textureGain.connect(master)
    texture.start()
    nodes.push(texture, textureFilter, textureGain)
    return { master, filter, pads, texture, textureFilter, textureGain, nodes }
  }

  private applyAtmosphere() {
    if (!this.graph || !this.context) return
    const settings = SCORE_SETTINGS[this.atmosphere]
    const now = this.context.currentTime
    this.graph.pads.forEach((pad, index) => {
      ramp(pad.frequency, midiFrequency(settings.root + settings.padIntervals[index]), now, 2.4)
    })
    ramp(this.graph.filter.frequency, settings.cutoff, now, 2)
    ramp(this.graph.textureFilter.frequency, settings.textureCutoff, now, 2)
    ramp(this.graph.textureGain.gain, settings.textureGain, now, 2)
  }

  private playPluck(when: number) {
    const context = this.context!
    const settings = SCORE_SETTINGS[this.atmosphere]
    const intervals = settings.pluckIntervals
    const index = (this.step * 3 + Math.floor(this.step / 5)) % intervals.length
    ++this.step
    const oscillator = context.createOscillator()
    oscillator.type = 'triangle'
    oscillator.frequency.value = midiFrequency(settings.root + 12 + intervals[index])
    const envelope = context.createGain()
    envelope.gain.setValueAtTime(0, when)
    envelope.gain.linearRampToValueAtTime(.05, when + .035)
    envelope.gain.exponentialRampToValueAtTime(.0001, when + settings.pluckDecay)
    oscillator.connect(envelope)
    envelope.connect(this.graph!.filter)
    const pluck = { oscillator, envelope }
    this.plucks.add(pluck)
    oscillator.onended = () => {
      this.plucks.delete(pluck)
      oscillator.disconnect()
      envelope.disconnect()
    }
    oscillator.start(when)
    oscillator.stop(when + settings.pluckDecay + .05)
  }

  private clearInterval() {
    if (this.interval !== null) clearInterval(this.interval)
    this.interval = null
  }

  private clearPauseTimer() {
    if (this.pauseTimer !== null) clearTimeout(this.pauseTimer)
    this.pauseTimer = null
  }
}

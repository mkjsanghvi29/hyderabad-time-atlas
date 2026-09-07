import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_MUSIC_GAIN, musicGain, SCORE_SETTINGS, TourSoundtrack } from './tourSoundtrack'

class FakeParam {
  value = 0
  cancelAndHoldAtTime = vi.fn()
  linearRampToValueAtTime = vi.fn((value: number) => { this.value = value })
  exponentialRampToValueAtTime = vi.fn((value: number) => { this.value = value })
  setValueAtTime = vi.fn((value: number) => { this.value = value })
}

class FakeNode {
  gain = new FakeParam()
  frequency = new FakeParam()
  detune = new FakeParam()
  Q = new FakeParam()
  type = 'sine'
  loop = false
  buffer: unknown
  onended: (() => void) | null = null
  connect = vi.fn()
  disconnect = vi.fn()
  start = vi.fn()
  stop = vi.fn()
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  state: AudioContextState = 'suspended'
  currentTime = 0
  sampleRate = 8000
  destination = new FakeNode()
  nodes: FakeNode[] = []
  resume = vi.fn(async () => { this.state = 'running' })
  suspend = vi.fn(async () => { this.state = 'suspended' })
  close = vi.fn(async () => { this.state = 'closed' })
  constructor() { FakeAudioContext.instances.push(this) }
  createGain = () => this.node()
  createBiquadFilter = () => this.node()
  createOscillator = () => this.node()
  createBufferSource = () => this.node()
  createBuffer = (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) })
  private node() {
    const node = new FakeNode()
    this.nodes.push(node)
    return node
  }
}

describe('original tour score', () => {
  const scores: TourSoundtrack[] = []
  const create = () => {
    const score = new TourSoundtrack()
    scores.push(score)
    return score
  }
  beforeEach(() => {
    vi.useFakeTimers()
    FakeAudioContext.instances = []
    vi.stubGlobal('AudioContext', FakeAudioContext)
  })
  afterEach(async () => {
    const disposals = scores.splice(0).map((score) => score.dispose())
    await vi.advanceTimersByTimeAsync(200)
    await Promise.all(disposals)
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('defines a distinct restrained palette for all six atmospheres', () => {
    expect(Object.keys(SCORE_SETTINGS)).toEqual(['fort', 'bazaar', 'river', 'palace', 'campus', 'modern'])
    expect(new Set(Object.values(SCORE_SETTINGS).map((settings) => JSON.stringify(settings))).size).toBe(6)
    for (const settings of Object.values(SCORE_SETTINGS)) {
      expect(settings.padIntervals).toHaveLength(3)
      expect(settings.root).toBeGreaterThanOrEqual(48)
      expect(settings.root).toBeLessThanOrEqual(55)
      expect(settings.cutoff).toBeLessThan(1200)
      expect(settings.textureGain).toBeLessThan(.012)
      expect(settings.pluckEvery).toBeGreaterThan(3)
      expect(settings.pluckIntervals.every((interval) => interval >= 0 && interval <= 26)).toBe(true)
    }
  })

  it('clamps volume, preserves absolute silence at zero, and rejects non-finite values', () => {
    expect(musicGain(0)).toBe(0)
    expect(musicGain(-1)).toBe(0)
    expect(musicGain(1)).toBe(MAX_MUSIC_GAIN)
    expect(musicGain(4)).toBe(MAX_MUSIC_GAIN)
    expect(musicGain(.5)).toBe(MAX_MUSIC_GAIN / 2)
    expect(() => musicGain(NaN)).toThrow(RangeError)
    expect(() => musicGain(Infinity)).toThrow(RangeError)
  })

  it('creates no context, nodes or timers before an explicit start', () => {
    const score = create()
    score.setVolume(.4)
    score.setAtmosphere('river')
    score.pause()
    expect(FakeAudioContext.instances).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps the same graph through chapter changes and mutes smoothly', async () => {
    const score = create()
    await score.start('fort', .5)
    const context = FakeAudioContext.instances[0]
    const count = context.nodes.length
    const master = context.nodes[0]
    expect(master.gain.value).toBe(musicGain(.5))
    await score.start('palace', .3)
    score.setAtmosphere('modern')
    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(context.nodes).toHaveLength(count)
    expect(vi.getTimerCount()).toBe(1)
    score.setVolume(0)
    expect(master.gain.value).toBe(0)
    expect(master.gain.cancelAndHoldAtTime).toHaveBeenCalled()
    expect(master.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, .12)
  })

  it('starts silently when music volume is zero', async () => {
    await create().start('river', 0)
    expect(FakeAudioContext.instances[0].nodes[0].gain.value).toBe(0)
  })

  it('pauses, suspends and resumes the existing context', async () => {
    const score = create()
    await score.start('river', .5)
    const context = FakeAudioContext.instances[0]
    score.pause()
    expect(context.nodes[0].gain.value).toBe(0)
    await vi.advanceTimersByTimeAsync(200)
    expect(context.suspend).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
    await score.start('campus', .4)
    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(context.resume).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('cancels an old pause timer when the user immediately resumes', async () => {
    const score = create()
    await score.start('fort', .5)
    const context = FakeAudioContext.instances[0]
    score.pause()
    await score.start('bazaar', .5)
    await vi.advanceTimersByTimeAsync(1000)
    expect(context.suspend).not.toHaveBeenCalled()
    expect(context.state).toBe('running')
  })

  it('does not reactivate after pause during an outstanding resume', async () => {
    const score = create()
    await score.start('fort', .4)
    const context = FakeAudioContext.instances[0]
    score.pause()
    await vi.advanceTimersByTimeAsync(200)
    let finishResume = () => {}
    context.resume.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishResume = () => { context.state = 'running'; resolve() }
    }))
    const pending = score.start('river', .4)
    score.pause()
    finishResume()
    await pending
    await vi.advanceTimersByTimeAsync(200)
    expect(context.state).toBe('suspended')
    expect(context.nodes[0].gain.value).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('waits for an in-flight suspend before resuming the same context', async () => {
    const score = create()
    await score.start('fort', .4)
    const context = FakeAudioContext.instances[0]
    let finishSuspend = () => {}
    context.suspend.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishSuspend = () => { context.state = 'suspended'; resolve() }
    }))
    score.pause()
    await vi.advanceTimersByTimeAsync(200)
    const pending = score.start('modern', .4)
    expect(context.resume).toHaveBeenCalledTimes(1)
    finishSuspend()
    await pending
    expect(context.state).toBe('running')
    expect(context.resume).toHaveBeenCalledTimes(2)
  })

  it('keeps a very late resume muted and suspends it after the pause timer has already fired', async () => {
    const score = create()
    await score.start('fort', .4)
    const context = FakeAudioContext.instances[0]
    score.pause()
    await vi.advanceTimersByTimeAsync(200)
    let finishResume = () => {}
    context.resume.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishResume = () => { context.state = 'running'; resolve() }
    }))
    const pending = score.start('river', .4)
    score.pause()
    await vi.advanceTimersByTimeAsync(1000)
    finishResume()
    await pending
    await vi.advanceTimersByTimeAsync(200)
    expect(context.state).toBe('suspended')
    expect(context.nodes[0].gain.value).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reports unsupported audio and blocked starts through rejected promises', async () => {
    vi.stubGlobal('AudioContext', undefined)
    await expect(create().start('fort', .4)).rejects.toThrow('not supported')
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const score = create()
    await score.start('fort', .4)
    const context = FakeAudioContext.instances[0]
    score.pause()
    await vi.advanceTimersByTimeAsync(200)
    context.resume.mockRejectedValueOnce(new Error('Audio permission denied'))
    await expect(score.start('fort', .4)).rejects.toThrow('Audio permission denied')
    expect(context.nodes[0].gain.value).toBe(0)
  })

  it('releases all sources, nodes and timers, including an active pluck', async () => {
    const score = create()
    await score.start('fort', .4)
    const context = FakeAudioContext.instances[0]
    context.currentTime = 2
    await vi.advanceTimersByTimeAsync(400)
    const started = context.nodes.filter((node) => node.start.mock.calls.length > 0)
    expect(started).toHaveLength(5)
    score.pause()
    const disposal = score.dispose()
    await vi.advanceTimersByTimeAsync(1000)
    await disposal
    expect(vi.getTimerCount()).toBe(0)
    expect(started.every((node) => node.stop.mock.calls.length > 0)).toBe(true)
    expect(context.nodes.every((node) => node.disconnect.mock.calls.length > 0)).toBe(true)
    expect(context.close).toHaveBeenCalledOnce()
    await score.dispose()
    expect(context.close).toHaveBeenCalledOnce()
    await expect(score.start('fort', .4)).rejects.toThrow('disposed')
  })
})

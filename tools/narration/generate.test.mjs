import { describe, expect, it } from 'vitest'
import { sentenceChunks, SETTINGS, scriptFingerprint, splitLongChunk, spokenText } from './generate.mjs'

describe('narration production invariants', () => {
  it('uses one named stock voice, full precision, and a measured pace', () => {
    expect(SETTINGS.voice).toBe('bm_george')
    expect(SETTINGS.dtype).toBe('fp32')
    expect(SETTINGS.speed).toBe(.9)
    expect(SETTINGS.loudness).toBe(-18)
    expect(SETTINGS.truePeak).toBeLessThan(-2)
  })
  it('selects the complete pronunciation text when available, without silently accepting empty scripts', () => {
    expect(spokenText({ id: 'one', narration: 'A whole sentence.', speechText: 'A whole spoken sentence.' })).toBe('A whole spoken sentence.')
    expect(spokenText({ id: 'two', narration: 'A whole sentence.' })).toBe('A whole sentence.')
    expect(() => spokenText({ id: 'empty', narration: '' })).toThrow('Missing complete narration')
  })
  it('retains all sentences, paragraph endings and final words', () => {
    const text = 'A hill rises above the plain. Dr. Rao walks north.\n\nThe river bends; then the city opens! One last observation'
    const chunks = sentenceChunks(text)
    expect(chunks.join(' ')).toBe(text.replace(/\s+/g, ' '))
    expect(chunks.at(-1)).toBe('One last observation')
    expect(chunks.length).toBeGreaterThan(2)
  })
  it('splits oversized sentences without dropping or reordering words', () => {
    const text = Array.from({ length: 800 }, (_, index) => `word${index}`).join(' ')
    const halves = splitLongChunk(text)
    expect(halves.join(' ')).toBe(text)
    expect(halves.every((half) => half.length < text.length)).toBe(true)
    expect(() => splitLongChunk('unbroken')).toThrow('exceeds model context')
  })
  it('invalidates audio when spoken content or synthesis dependencies change', () => {
    const stop = { id: 'one', narration: 'The full script.' }
    const fingerprint = scriptFingerprint(stop, 'locked-dependencies')
    expect(scriptFingerprint(stop, 'locked-dependencies')).toBe(fingerprint)
    expect(scriptFingerprint({ ...stop, speechText: 'The full revised script.' }, 'locked-dependencies')).not.toBe(fingerprint)
    expect(scriptFingerprint(stop, 'different-dependencies')).not.toBe(fingerprint)
  })
})

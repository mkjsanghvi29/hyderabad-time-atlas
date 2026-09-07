import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const toolDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(toolDir, '../..')
const workDir = join(toolDir, '.work')
const outputDir = join(root, 'public/narration')
const manifestPath = join(toolDir, 'manifest.json')
const ffmpeg = process.env.FFMPEG || 'ffmpeg'
const ffprobe = process.env.FFPROBE || 'ffprobe'

export const SETTINGS = Object.freeze({
  pipelineVersion: 1,
  model: 'onnx-community/Kokoro-82M-v1.0-ONNX',
  modelRevision: '1939ad2a8e416c0acfeecc08a694d14ef25f2231',
  dtype: 'fp32',
  voice: 'bm_george',
  speed: 0.9,
  sampleRate: 24000,
  bitrate: '96k',
  loudness: -18,
  truePeak: -2.5,
  sentencePause: 0.18,
  leadIn: 0.12,
  leadOut: 0.25,
})

const PREVIEW = {
  id: 'preview',
  title: 'An original voice for Hyderabad Time Atlas',
  narration: 'Before Hyderabad was a city of towers, its story gathered around a hill of granite. Across five centuries, we will follow the water, the streets, and the people who made this place their home.',
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function spokenText(stop) {
  const text = (stop.speechText ?? stop.narration)?.trim()
  if (!text) throw new Error(`Missing complete narration for ${stop.id}`)
  return text
}

export function sentenceChunks(text) {
  const segments = new Intl.Segmenter('en-GB', { granularity: 'sentence' }).segment(text)
  const chunks = [...segments].map(({ segment }) => segment.trim()).filter(Boolean)
  if (chunks.join(' ').replace(/\s+/g, ' ') !== text.trim().replace(/\s+/g, ' ')) {
    throw new Error('Sentence segmentation changed the script')
  }
  return chunks
}

export function splitLongChunk(text) {
  const words = text.trim().split(/\s+/)
  if (words.length < 2) throw new Error('An unbroken narration token exceeds model context')
  const middle = Math.ceil(words.length / 2)
  return [words.slice(0, middle).join(' '), words.slice(middle).join(' ')]
}

export function scriptFingerprint(stop, lockHash) {
  return digest(JSON.stringify({ script: spokenText(stop), settings: SETTINGS, lockHash }))
}

class ContextLimitError extends Error {}

async function readJsonIfPresent(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

async function writeJsonAtomic(path, value) {
  const staged = join(workDir, 'manifest.next.json')
  await writeFile(staged, `${JSON.stringify(value, null, 2)}\n`)
  await rename(staged, path)
}

async function run(program, args) {
  return exec(program, args, { maxBuffer: 4 * 1024 * 1024 })
}

function loudnessJson(stderr) {
  const matches = stderr.match(/\{\s*"input_i"[\s\S]*?\}/g)
  if (!matches?.length) throw new Error('ffmpeg did not return loudness measurements')
  const result = JSON.parse(matches.at(-1))
  for (const key of ['input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset']) {
    if (!Number.isFinite(Number(result[key]))) throw new Error(`Invalid audio measurement: ${key}`)
  }
  return result
}

async function measureLoudness(path) {
  const { stderr } = await run(ffmpeg, [
    '-hide_banner', '-nostdin', '-i', path,
    '-af', `loudnorm=I=${SETTINGS.loudness}:TP=${SETTINGS.truePeak}:LRA=7:print_format=json`,
    '-f', 'null', '-',
  ])
  return loudnessJson(stderr)
}

async function validateAudio(path, text) {
  const { stdout } = await run(ffprobe, [
    '-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,channels,sample_rate',
    '-of', 'json', path,
  ])
  const probe = JSON.parse(stdout)
  const duration = Number(probe.format.duration)
  const bytes = Number(probe.format.size)
  const stream = probe.streams[0]
  if (probe.streams.length !== 1 || stream.codec_name !== 'mp3' || stream.channels !== 1
    || Number(stream.sample_rate) !== SETTINGS.sampleRate || !Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Invalid browser narration format: ${path}`)
  }
  const words = text.split(/\s+/).length
  const wordsPerMinute = words * 60 / duration
  if (wordsPerMinute < 85 || wordsPerMinute > 210) {
    throw new Error(`Possible incomplete or abnormally paced narration: ${path}, ${wordsPerMinute.toFixed(1)} WPM`)
  }
  const loudness = await measureLoudness(path)
  const integratedLufs = Number(loudness.input_i)
  const truePeakDb = Number(loudness.input_tp)
  if (integratedLufs < -20.5 || integratedLufs > -16 || truePeakDb > -0.8) {
    throw new Error(`Unsafe or unexpectedly quiet narration: ${path}, ${integratedLufs} LUFS / ${truePeakDb} dBTP`)
  }
  const { stderr } = await run(ffmpeg, [
    '-hide_banner', '-nostdin', '-i', path,
    '-af', 'volumedetect,silencedetect=noise=-45dB:d=3', '-f', 'null', '-',
  ])
  const meanDb = Number(stderr.match(/mean_volume: (-?[\d.]+) dB/)?.[1])
  const maxDb = Number(stderr.match(/max_volume: (-?[\d.]+) dB/)?.[1])
  if (!Number.isFinite(meanDb) || meanDb < -35 || !Number.isFinite(maxDb) || maxDb > -0.5) {
    throw new Error(`Non-silent waveform validation failed: ${path}`)
  }
  if ([...stderr.matchAll(/silence_duration: ([\d.]+)/g)].some((match) => Number(match[1]) >= 3)) {
    throw new Error(`Unexpected long silence in narration: ${path}`)
  }
  return {
    duration: Number(duration.toFixed(3)), bytes, words, wordsPerMinute: Number(wordsPerMinute.toFixed(1)),
    integratedLufs, truePeakDb, meanDb, maxDb, sha256: digest(await readFile(path)),
  }
}

async function loadTts() {
  const [{ KokoroTTS }, { env }] = await Promise.all([
    import('kokoro-js'), import('@huggingface/transformers'),
  ])
  env.cacheDir = resolve(process.env.TTS_CACHE_DIR || join(toolDir, '.cache/models'), SETTINGS.modelRevision)
  env.remotePathTemplate = `{model}/resolve/${SETTINGS.modelRevision}/`
  env.allowLocalModels = false
  await mkdir(env.cacheDir, { recursive: true })
  console.log(`Loading ${SETTINGS.model} (${SETTINGS.dtype}); voice ${SETTINGS.voice}`)
  const tts = await KokoroTTS.from_pretrained(SETTINGS.model, {
    dtype: SETTINGS.dtype,
    device: 'cpu',
    progress_callback: (progress) => {
      if (progress.status === 'done') console.log(`Model file ready: ${progress.file}`)
    },
  })
  // Kokoro 1.2.1 otherwise silently truncates in generate(); enforce the actual
  // phoneme-token count before inference and recursively split oversized text.
  const tokenizer = tts.tokenizer
  tts.tokenizer = (phonemes) => {
    const tokens = tokenizer(phonemes, { truncation: false })
    if (tokens.input_ids.dims.at(-1) > 512) throw new ContextLimitError('Sentence exceeds 512 tokens')
    return tokens
  }
  return tts
}

async function generateChunk(tts, text) {
  let audio
  try {
    audio = await tts.generate(text, { voice: SETTINGS.voice, speed: SETTINGS.speed })
  } catch (error) {
    if (!(error instanceof ContextLimitError)) throw error
    const chunks = []
    for (const half of splitLongChunk(text)) chunks.push(...await generateChunk(tts, half))
    return chunks
  }
  if (audio.sampling_rate !== SETTINGS.sampleRate || audio.audio.length < text.split(/\s+/).length / 5 * SETTINGS.sampleRate) {
    throw new Error(`Suspiciously short synthesis for: ${text}`)
  }
  let energy = 0
  for (const sample of audio.audio) {
    if (!Number.isFinite(sample)) throw new Error('Synthesis returned a non-finite sample')
    energy += sample * sample
  }
  if (Math.sqrt(energy / audio.audio.length) < 0.001) throw new Error(`Silent synthesis for: ${text}`)
  return [{ text, samples: audio.audio }]
}

async function generateClip(tts, stop, destination) {
  const text = spokenText(stop)
  const chunks = []
  for (const sentence of sentenceChunks(text)) chunks.push(...await generateChunk(tts, sentence))
  if (chunks.map((chunk) => chunk.text).join(' ').replace(/\s+/g, ' ') !== text.replace(/\s+/g, ' ')) {
    throw new Error(`Incomplete synthesis for ${stop.id}`)
  }
  const pause = Math.round(SETTINGS.sentencePause * SETTINGS.sampleRate)
  const leadIn = Math.round(SETTINGS.leadIn * SETTINGS.sampleRate)
  const leadOut = Math.round(SETTINGS.leadOut * SETTINGS.sampleRate)
  const length = chunks.reduce((total, chunk) => total + chunk.samples.length, leadIn + leadOut + pause * (chunks.length - 1))
  const samples = new Float32Array(length)
  let offset = leadIn
  for (const chunk of chunks) {
    samples.set(chunk.samples, offset)
    offset += chunk.samples.length + pause
  }
  const { RawAudio } = await import('@huggingface/transformers')
  const wav = join(workDir, `${stop.id}.wav`)
  const mp3 = join(workDir, `${stop.id}.mp3`)
  try {
    await new RawAudio(samples, SETTINGS.sampleRate).save(wav)
    const measured = await measureLoudness(wav)
    const filter = [
      `loudnorm=I=${SETTINGS.loudness}:TP=${SETTINGS.truePeak}:LRA=7`,
      `measured_I=${measured.input_i}`, `measured_TP=${measured.input_tp}`,
      `measured_LRA=${measured.input_lra}`, `measured_thresh=${measured.input_thresh}`,
      `offset=${measured.target_offset}`, 'linear=true',
    ].join(':')
    await run(ffmpeg, [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', wav,
      '-af', filter, '-ac', '1', '-ar', String(SETTINGS.sampleRate),
      '-codec:a', 'libmp3lame', '-b:a', SETTINGS.bitrate, '-map_metadata', '-1',
      '-metadata', `title=${stop.title}`, '-metadata', 'artist=Hyderabad Time Atlas - synthetic Kokoro bm_george voice',
      '-metadata', 'comment=Original documentary script; synthetic narration, not a historical recording.',
      mp3,
    ])
    const metrics = await validateAudio(mp3, text)
    await rename(mp3, destination)
    return { ...metrics, chunks: chunks.length, spokenTextSha256: digest(text), completeScript: true }
  } finally {
    await rm(wav, { force: true })
    await rm(mp3, { force: true })
  }
}

async function loadStops() {
  const { AUDIO_TOUR_STOPS } = await import(pathToFileURL(join(root, 'src/audioTourData.ts')).href)
  const years = [1518, 1591, 1687, 1763, 1908, 1948, 1998, 2025]
  if (AUDIO_TOUR_STOPS.length !== 16
    || years.some((year) => AUDIO_TOUR_STOPS.filter((stop) => stop.year === year).length !== 2)
    || new Set(AUDIO_TOUR_STOPS.map((stop) => stop.id)).size !== 16) {
    throw new Error('Expected exactly 16 unique tour stops, two in each atlas era')
  }
  for (const stop of AUDIO_TOUR_STOPS) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(stop.id)) throw new Error(`Unsafe narration id: ${stop.id}`)
    spokenText(stop)
  }
  return AUDIO_TOUR_STOPS
}

async function emitAssets(stops, manifest) {
  const lines = stops.map((stop) => `  '${stop.id}': { src: 'narration/${stop.id}.mp3', duration: ${manifest.clips[stop.id].duration} },`)
  const source = [
    '// Generated by tools/narration/generate.mjs. Do not edit durations by hand.',
    'export const NARRATION_AUDIO: Record<string, { src: string; duration: number }> = {',
    ...lines, '}', '',
    'export const NARRATOR = {',
    "  label: 'Original synthetic British male narration',",
    `  voice: '${SETTINGS.voice}',`,
    `  model: '${SETTINGS.model}',`,
    "  license: 'Apache-2.0 model and synthesis library',",
    "  notice: 'narration/NOTICE.txt',",
    '} as const', '',
  ].join('\n')
  await writeFile(join(root, 'src/audioTourAssets.ts'), source)
}

export async function main(args = process.argv.slice(2)) {
  if (args.includes('--help')) {
    console.log('npm ci --prefix tools/narration; npm run preview --prefix tools/narration; npm run generate --prefix tools/narration; npm run validate --prefix tools/narration\nRequires Node 22.21+, ffmpeg and ffprobe. Optional TTS_CACHE_DIR, FFMPEG, FFPROBE environment variables. Audio is generated locally; no scripts are sent to a TTS API. Only --preview, --validate, --force, --help are supported.')
    return
  }
  if (args.some((arg) => !['--preview', '--validate', '--force'].includes(arg))) throw new Error('Unknown generator argument; use --help')
  if (args.includes('--preview') && args.includes('--validate')) throw new Error('Choose preview or validate, not both')
  if (args.includes('--validate') && args.includes('--force')) throw new Error('Validation cannot force regeneration')
  await mkdir(workDir, { recursive: true })
  await mkdir(outputDir, { recursive: true })
  await run(ffmpeg, ['-version'])
  await run(ffprobe, ['-version'])
  if (args.includes('--preview')) {
    const tts = await loadTts()
    try {
      const previewPath = join(workDir, 'original-voice-preview.mp3')
      const metrics = await generateClip(tts, PREVIEW, previewPath)
      console.log(JSON.stringify({ previewPath, ...metrics }, null, 2))
    } finally {
      await tts.model.dispose()
    }
    return
  }
  const stops = await loadStops()
  const lockHash = digest(await readFile(join(toolDir, 'package-lock.json')))
  const manifest = await readJsonIfPresent(manifestPath) ?? { settings: SETTINGS, clips: {} }
  const validateOnly = args.includes('--validate')
  let tts
  try {
    for (const [index, stop] of stops.entries()) {
      const path = join(outputDir, `${stop.id}.mp3`)
      const fingerprint = scriptFingerprint(stop, lockHash)
      const previous = manifest.clips[stop.id]
      const unchanged = previous?.fingerprint === fingerprint && await exists(path)
        && previous.sha256 === digest(await readFile(path))
      if (validateOnly && !unchanged) throw new Error(`Missing, outdated or modified audio: ${stop.id}. Run generation.`)
      if (unchanged && !args.includes('--force')) {
        await validateAudio(path, spokenText(stop))
        console.log(`[${index + 1}/16] Verified unchanged ${stop.id}`)
        continue
      }
      tts ??= await loadTts()
      console.log(`[${index + 1}/16] Generating ${stop.id}`)
      const metrics = await generateClip(tts, stop, path)
      manifest.settings = SETTINGS
      manifest.clips[stop.id] = { fingerprint, ...metrics }
      await writeJsonAtomic(manifestPath, manifest)
      console.log(`  ${metrics.duration}s; ${metrics.wordsPerMinute} WPM; ${metrics.integratedLufs} LUFS; ${metrics.bytes} bytes`)
    }
  } finally {
    if (tts) await tts.model.dispose()
  }
  if (!validateOnly) await emitAssets(stops, manifest)
  const totals = stops.reduce((total, stop) => {
    const clip = manifest.clips[stop.id]
    return { duration: total.duration + clip.duration, bytes: total.bytes + clip.bytes }
  }, { duration: 0, bytes: 0 })
  console.log(JSON.stringify({ clips: stops.length, duration: Number(totals.duration.toFixed(3)), bytes: totals.bytes }, null, 2))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

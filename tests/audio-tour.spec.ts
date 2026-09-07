import { expect, test } from '@playwright/test'
import { AUDIO_TOUR_STOPS } from '../src/audioTourData'

function audioFixture() {
  const rate = 8000, frames = rate * 20
  const wav = Buffer.alloc(44 + frames * 2)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(wav.length - 8, 4)
  wav.write('WAVEfmt ', 8)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(rate, 24)
  wav.writeUInt32LE(rate * 2, 28)
  wav.writeUInt16LE(2, 32)
  wav.writeUInt16LE(16, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(frames * 2, 40)
  for (let frame = 0; frame < frames; frame++) wav.writeInt16LE(Math.round(Math.sin(frame / rate * Math.PI * 220) * 300), 44 + frame * 2)
  return wav
}

test('the tour is opt-in and supports arrival, playback, music controls and free exploration', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  const requests: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/narration/*.mp3', (route) => {
    requests.push(route.request().url())
    const wav = audioFixture()
    const range = route.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/)
    const start = range ? Number(range[1]) : 0
    const end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1
    return route.fulfill({
      status: range ? 206 : 200, contentType: 'audio/wav', body: wav.subarray(start, end + 1),
      headers: { 'Accept-Ranges': 'bytes', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${wav.length}` } : {}) },
    })
  })
  await page.goto('/?year=1591&view=atlas')
  const audio = page.getByTestId('tour-narration')
  await expect(page.locator('.audio-tour-bar')).toHaveCount(0)
  expect(await audio.evaluate((element: HTMLAudioElement) => element.paused && !element.currentSrc)).toBe(true)
  expect(requests).toEqual([])
  await page.getByRole('button', { name: 'Open guided audio tour', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Guided audio tour', exact: true })
  await expect(dialog.getByRole('button', { name: /^Start audio stop:/ })).toHaveCount(16)
  await dialog.getByRole('button', { name: 'Start full audio tour', exact: true }).click()
  const bar = page.getByRole('region', { name: 'Audio tour player', exact: true })
  await expect(bar).toHaveAttribute('data-phase', 'playing', { timeout: 40_000 })
  await expect(bar).toHaveAttribute('data-stop', AUDIO_TOUR_STOPS[0].id)
  await expect(page.locator('canvas')).toHaveAttribute('data-era', '1518')
  await expect(page.locator('canvas')).toHaveAttribute('data-guided-arrival', /\d+/)
  await expect(page.locator('canvas')).toHaveAttribute('data-cinematic', 'true')
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(.15)
  await page.screenshot({ path: testInfo.outputPath('guided-tour-playing.png') })
  await page.getByRole('button', { name: 'Pause audio tour', exact: true }).click()
  await expect(bar).toHaveAttribute('data-phase', 'paused')
  expect(await audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true)
  await page.getByRole('button', { name: 'Transcript & settings', exact: true }).click()
  await dialog.getByRole('checkbox', { name: 'Background music', exact: true }).uncheck()
  await dialog.getByRole('checkbox', { name: 'Cinematic camera motion', exact: true }).uncheck()
  await dialog.getByRole('button', { name: 'Close audio tour guide', exact: true }).click()
  await page.getByRole('button', { name: 'Play audio tour', exact: true }).click()
  await expect(bar).toHaveAttribute('data-phase', 'playing', { timeout: 30_000 })
  await expect(page.locator('canvas')).toHaveAttribute('data-cinematic', 'false')
  await audio.evaluate((element: HTMLAudioElement) => { element.currentTime = element.duration - .1 })
  await expect(bar).toHaveAttribute('data-stop', AUDIO_TOUR_STOPS[1].id, { timeout: 15_000 })
  await expect(bar).toHaveAttribute('data-phase', 'playing', { timeout: 30_000 })
  await page.getByRole('button', { name: /1591:/ }).click()
  await expect(bar).toHaveAttribute('data-phase', 'paused')
  await expect(page).toHaveURL(/year=1591/)
  expect(await audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true)
  await page.getByRole('button', { name: 'Stop audio tour', exact: true }).click()
  await expect(bar).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

test('missing narration is reported without silently advancing the journey', async ({ page }) => {
  await page.route('**/narration/*.mp3', (route) => route.fulfill({ status: 404 }))
  await page.goto('/?year=1591&view=atlas')
  await page.getByRole('button', { name: 'Open guided audio tour', exact: true }).click()
  await page.getByRole('button', { name: 'Start full audio tour', exact: true }).click()
  const bar = page.getByRole('region', { name: 'Audio tour player', exact: true })
  await expect(bar).toHaveAttribute('data-phase', 'error')
  await expect(bar).toHaveAttribute('data-stop', AUDIO_TOUR_STOPS[0].id)
  await page.getByRole('button', { name: 'Transcript & settings', exact: true }).click()
  await expect(page.getByRole('article', { name: 'Current narration transcript', exact: true })).toContainText(AUDIO_TOUR_STOPS[0].title)
})

test('reduced motion disables cinematic orbit without disabling the audio option', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?year=1998&view=atlas')
  await page.getByRole('button', { name: 'Open guided audio tour', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: 'Cinematic camera motion', exact: true })).toBeDisabled()
  await expect(page.getByRole('checkbox', { name: 'Cinematic camera motion', exact: true })).not.toBeChecked()
  await expect(page.getByRole('button', { name: 'Start full audio tour', exact: true })).toBeEnabled()
})

test('the complete recorded tour visits all sixteen stops and finishes on the modern map', async ({ page }, testInfo) => {
  test.skip(process.env.ATLAS_LIVE_MAPS !== '1' || testInfo.project.name !== 'desktop', 'Full recorded tour includes live 2025 cartography')
  test.setTimeout(300_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/?year=1591')
  await page.getByRole('button', { name: 'Open guided audio tour', exact: true }).click()
  await page.getByRole('button', { name: 'Start full audio tour', exact: true }).click()
  const bar = page.getByRole('region', { name: 'Audio tour player', exact: true })
  const audio = page.getByTestId('tour-narration')
  for (const [index, stop] of AUDIO_TOUR_STOPS.entries()) {
    await expect(bar).toHaveAttribute('data-stop', stop.id, { timeout: 60_000 })
    await expect(bar).toHaveAttribute('data-phase', 'playing', { timeout: 60_000 })
    await expect(page).toHaveURL(new RegExp(`year=${stop.year}`))
    await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => !element.paused && !element.muted && element.currentTime > .1)).toBe(true)
    if ([0, 12, 14].includes(index)) await page.screenshot({ path: testInfo.outputPath(`recorded-tour-${stop.year}.png`) })
    await audio.evaluate((element: HTMLAudioElement) => { element.currentTime = element.duration - .15 })
  }
  await expect(bar).toHaveAttribute('data-phase', 'complete', { timeout: 15_000 })
  await expect(page.locator('.geographic-scene')).toHaveAttribute('data-layer', 'streets')
  expect(errors).toEqual([])
})

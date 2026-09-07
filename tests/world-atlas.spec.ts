import { expect, test } from '@playwright/test'
import { WORLD_CITIES } from '../src/world/registry'
import { placesInChapter, yearLabel } from '../src/world/geography'

for (const city of WORLD_CITIES) {
  test(`${city.name}: every chapter has its own landmarks, stats and offline scene`, async ({ page }, testInfo) => {
    test.setTimeout(150_000)
    const errors: string[] = []
    const network: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (request) => { if (/openfreemap|mapterhorn|photon|narration\//.test(request.url())) network.push(request.url()) })
    await page.goto(`/?city=${city.id}&view=atlas&scoutTheme=light`)
    const canvas = page.locator('.world-viewport canvas')
    for (const chapter of city.chapters) {
      await page.getByRole('button', { name: `${yearLabel(chapter.year)}: ${chapter.label}`, exact: true }).click()
      await expect(canvas).toHaveAttribute('data-city', city.id)
      await expect(canvas).toHaveAttribute('data-era', String(chapter.year))
      await expect(canvas).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })
      const expected = placesInChapter(city, chapter.year).map((place) => place.id).sort()
      await expect.poll(async () => (await canvas.getAttribute('data-landmarks'))?.split(',').filter(Boolean).sort()).toEqual(expected)
      if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Read this chapter', exact: true }).click()
      await expect(page.locator('.world-stat')).toHaveCount(chapter.stats.length)
      await expect(page.locator('.chapter-panel h1')).toHaveText(chapter.title)
      if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Close chapter', exact: true }).click()
    }
    await page.screenshot({ path: testInfo.outputPath(`${city.id}-illustrated.png`) })
    await page.getByRole('button', { name: 'Expand city map of ' + city.name, exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Explore the whole city' })).toBeVisible()
    await page.getByRole('button', { name: 'Close city map', exact: true }).click()
    await page.getByRole('button', { name: 'Research and sources', exact: true }).click()
    await expect(page.getByRole('dialog').filter({ hasText: 'the evidence behind the scene' })).toContainText(city.reconstructionNote)
    expect(await page.locator('audio').count()).toBe(0)
    expect(network).toEqual([])
    expect(errors).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}

test('the city picker clears old place context and browser back returns to Hyderabad', async ({ page }) => {
  await page.goto('/?year=1591&place=charminar&view=atlas&scoutTheme=dark')
  await page.getByRole('combobox', { name: 'Choose a city' }).selectOption('cairo')
  await expect(page.locator('[data-world-city]')).toHaveAttribute('data-world-city', 'cairo')
  await expect(page).not.toHaveURL(/charminar|1998|satellite/)
  await expect(page).toHaveURL(/scoutTheme=dark/)
  await expect(page.locator('audio')).toHaveCount(0)
  await page.goBack()
  await expect(page.getByRole('combobox', { name: 'Choose a city' })).toHaveValue('hyderabad')
  await expect(page.locator('.field-note-panel')).toContainText('Charminar')
})

test('self-guided stops, manual camera controls and dated place pinning work together', async ({ page }, testInfo) => {
  const city = WORLD_CITIES[0]
  const chapter = city.chapters[2]
  const available = placesInChapter(city, chapter.year)
  await page.goto(`/?city=${city.id}&year=${chapter.year}&view=atlas`)
  const canvas = page.locator('.world-viewport canvas')
  await expect(canvas).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Read this chapter', exact: true }).click()
  await page.getByRole('button', { name: /Explore this chapter/ }).click()
  await expect(page.locator('.field-note-panel')).toContainText(available[0].name)
  if (available.length > 1) {
    await page.getByRole('button', { name: 'Next place →', exact: true }).click()
    await expect(page.locator('.field-note-panel')).toContainText(available[1].name)
  }
  await page.getByRole('button', { name: 'Close tour', exact: true }).click()
  await page.getByRole('button', { name: 'Keep this place as time changes', exact: true }).click()
  const pinned = new URL(page.url()).searchParams.get('place')
  await page.getByRole('button', { name: `2025: ${city.chapters.at(-1)!.label}`, exact: true }).click()
  const survives = placesInChapter(city, 2025).some((place) => place.id === pinned)
  if (survives) {
    await expect(page.getByRole('button', { name: 'Following this place through time', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Close field note', exact: true }).click()
  } else await expect(page.locator('.field-note-panel')).toHaveCount(0)
  await expect(canvas).toHaveAttribute('data-era', '2025')
  await expect(canvas).toHaveAttribute('data-ready', 'true')
  await canvas.focus()
  const before = await canvas.getAttribute('data-camera-z')
  await page.keyboard.down('w')
  await expect.poll(() => canvas.getAttribute('data-camera-z')).not.toBe(before)
  await page.keyboard.up('w')
  await page.locator('.camera-buttons').getByRole('button', { name: 'Zoom in', exact: true }).click()
  await page.getByRole('button', { name: 'Close-up', exact: true }).click()
  await page.getByRole('button', { name: 'Move forward', exact: true }).click()
  await page.getByRole('button', { name: 'Reset aerial view', exact: true }).click()
  await expect(page.locator('audio')).toHaveCount(0)
})

test('map failure stays explicit; historical exploration is available without network', async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort('failed'))
  await page.goto('/?city=london&year=2025')
  await expect(page.locator('.world-scene-error')).toContainText('Map unavailable')
  await page.getByRole('button', { name: 'Use illustrated reconstruction', exact: true }).click()
  await expect(page.locator('.world-viewport canvas')).toHaveAttribute('data-ready', 'true')
  await expect(page.locator('.world-viewport canvas')).toHaveAttribute('data-engine', /^three/)
})

test.describe('current real-world maps', () => {
  test.skip(process.env.ATLAS_LIVE_MAPS !== '1', 'Set ATLAS_LIVE_MAPS=1 for public geographic providers')
  for (const city of WORLD_CITIES) {
    test(`${city.name}: current map, actual destination and regional overview`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'One live-provider journey per city; responsive historical controls covered separately')
      test.setTimeout(120_000)
      const selected = placesInChapter(city, 2025).at(-1)!
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(`/?city=${city.id}&year=2025&place=${selected.id}&scoutTheme=light`)
      const canvas = page.locator('.world-viewport canvas')
      await expect(canvas).toHaveAttribute('data-engine', 'maplibre')
      await expect(canvas).toHaveAttribute('data-ready', 'true', { timeout: 60_000 })
      await expect(canvas).toHaveAttribute('data-terrain', 'non-dated-reference')
      await expect.poll(async () => Number(await canvas.getAttribute('data-camera-longitude'))).toBeCloseTo(selected.coordinates[0], 3)
      await expect.poll(async () => Number(await canvas.getAttribute('data-camera-latitude'))).toBeCloseTo(selected.coordinates[1], 3)
      await page.getByRole('button', { name: 'Close field note', exact: true }).click()
      await page.screenshot({ path: testInfo.outputPath(`${city.id}-real-map.png`) })
      await page.getByRole('button', { name: `Expand city map of ${city.name}`, exact: true }).click()
      const dialog = page.getByRole('dialog', { name: 'Explore the whole city' })
      const overview = dialog.locator('.geographic-overview canvas')
      await expect(overview).toHaveAttribute('data-ready', 'true', { timeout: 60_000 })
      await dialog.getByLabel('Find a landmark, place or coordinates').fill(`${city.center[1]}, ${city.center[0]}`)
      await dialog.getByRole('button', { name: 'Go', exact: true }).click()
      await expect(dialog).toBeHidden()
      await expect.poll(async () => Number(await canvas.getAttribute('data-camera-longitude'))).toBeCloseTo(city.center[0], 3)
      await expect(page).toHaveURL(new RegExp(`city=${city.id}`))
      await expect(page.locator('.world-scene-error')).toHaveCount(0)
      expect(errors).toEqual([])
    })
  }
})

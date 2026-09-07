import { expect, test } from '@playwright/test'

test('1998 opens as a 3D city while 2025 keeps its independent geographic view', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  const external: string[] = []
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (/tiles\.openfreemap\.org|tiles\.mapterhorn\.com|planetarycomputer\.microsoft\.com/.test(request.url())) external.push(request.url())
  })
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort())
  await page.goto('/?year=1998&place=charminar&scoutTheme=light')
  const canvas = page.locator('canvas')
  await expect(canvas).toHaveAttribute('data-era', '1998', { timeout: 30_000 })
  await expect.poll(async () => Number(await canvas.getAttribute('data-draw-calls')), { timeout: 30_000 }).toBeGreaterThan(10)
  await expect(page.locator('.geographic-scene')).toHaveCount(0)
  await expect(page.locator('.field-note-panel')).toContainText('Charminar')
  await expect(page.getByRole('button', { name: 'Street view', exact: true })).toBeEnabled()
  await page.screenshot({ path: testInfo.outputPath('1998-restored-3d.png') })
  expect(external).toEqual([])
  await expect(page).not.toHaveURL(/layer=satellite/)
  await page.getByRole('button', { name: /2025:/ }).click()
  await expect(page.locator('.geographic-scene')).toHaveCount(1)
  await expect(page).not.toHaveURL(/view=atlas/)
  await page.getByRole('button', { name: /1998:/ }).click()
  await expect(page.locator('.geographic-scene')).toHaveCount(0)
  await expect(canvas).toHaveAttribute('data-era', '1998', { timeout: 30_000 })
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: /Read this chapter/ }).click()
  await expect(page.getByRole('button', { name: '1998 satellite reference', exact: true })).toHaveAttribute('aria-pressed', 'false')
  expect(errors).toEqual([])
})

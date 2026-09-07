import { expect, test, type Page } from '@playwright/test'

const museum = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature', geometry: { type: 'Point', coordinates: [78.4801498, 17.371392] },
    properties: { name: 'Salar Jung Museum', osm_type: 'W', osm_id: 238284090, osm_value: 'museum', street: 'Darul Shifa Road' },
  }],
}

async function openSearch(page: Page, year = 2025) {
  await page.route(/^https:\/\/(tiles\.openfreemap\.org|tiles\.mapterhorn\.com|planetarycomputer\.microsoft\.com)\//, (route) => route.abort())
  await page.goto(`/?year=${year}`)
  await page.getByRole('button', { name: /Expand city map/ }).click()
  return page.getByRole('dialog', { name: 'Explore the whole city' })
}

test('city-wide search submits explicitly, credits results and travels beyond the catalogue', async ({ page }) => {
  const requests: string[] = []
  await page.route('https://photon.komoot.io/api/**', (route) => {
    requests.push(route.request().url())
    return route.fulfill({ json: museum })
  })
  const dialog = await openSearch(page)
  await dialog.getByLabel('Find a landmark, place or coordinates').fill('Salar Jung Museum')
  expect(requests).toEqual([])
  await dialog.getByRole('button', { name: 'Go', exact: true }).click()
  await expect(dialog.getByRole('link', { name: 'OpenStreetMap record for Salar Jung Museum' })).toHaveAttribute('href', 'https://www.openstreetmap.org/way/238284090')
  expect(new URL(requests[0]).searchParams.get('bbox')).toBe('78.1,17.1,78.9,17.75')
  await dialog.getByRole('button', { name: /^Travel to Salar Jung Museum:/ }).click()
  await expect(dialog).toBeHidden()
  await expect(page.locator('.destination-hud')).toContainText('Salar Jung Museum')
  await expect(page).toHaveURL(/lon=78.480150/)
  await expect(page).toHaveURL(/lat=17.371392/)
})

test('search failure is visible and coordinate navigation still works', async ({ page }) => {
  await page.route('https://photon.komoot.io/api/**', (route) => route.fulfill({ status: 503 }))
  const dialog = await openSearch(page)
  const input = dialog.getByLabel('Find a landmark, place or coordinates')
  await input.fill('Museum')
  await dialog.getByRole('button', { name: 'Go', exact: true }).click()
  await expect(dialog.locator('.navigator-error')).toContainText('503')
  await input.fill('17.371392, 78.4801498')
  await dialog.getByRole('button', { name: 'Go', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/lat=17.371392/)
})

test('an empty service result is distinct from an error', async ({ page }) => {
  await page.route('https://photon.komoot.io/api/**', (route) => route.fulfill({ json: { type: 'FeatureCollection', features: [] } }))
  const dialog = await openSearch(page)
  await dialog.getByLabel('Find a landmark, place or coordinates').fill('Unknown landmark')
  await dialog.getByRole('button', { name: 'Go', exact: true }).click()
  await expect(dialog).toContainText('No mapped matches in the Hyderabad area')
  await expect(dialog.locator('.navigator-error')).toHaveCount(0)
})

test('historical chapters never send queries to a current-place directory', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => { if (request.url().includes('photon.komoot.io')) requests.push(request.url()) })
  const dialog = await openSearch(page, 1998)
  await dialog.getByLabel('Find a landmark, place or coordinates').fill('Salar Jung Museum')
  await dialog.getByRole('button', { name: 'Go', exact: true }).click()
  await expect(dialog.locator('.navigator-error')).toBeVisible()
  expect(requests).toEqual([])
})

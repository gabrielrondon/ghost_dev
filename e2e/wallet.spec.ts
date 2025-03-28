import { test, expect } from '@playwright/test'

test('wallet connection flow', async ({ page }) => {
  // Navigate to the homepage
  await page.goto('/')

  // Check initial state - look for the connect button
  const connectButton = page.getByRole('button', { name: 'Connect Wallet' })
  await expect(connectButton).toBeVisible()

  // Click connect button
  await connectButton.click()

  // Verify connecting state with loading indicator
  await expect(page.getByText('Connecting...')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Loading' })).toBeVisible()
})

test('responsive design', async ({ page }) => {
  // Test mobile viewport
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  
  // Verify logo and title are visible
  const logo = page.getByRole('img', { name: 'Ghost Agent Logo' })
  await expect(logo).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ghost Agent' })).toBeVisible()

  // Test desktop viewport
  await page.setViewportSize({ width: 1280, height: 720 })
  
  // Verify wallet connect button is visible
  const connectButton = page.getByRole('button', { name: 'Connect Wallet' })
  await expect(connectButton).toBeVisible()
}) 
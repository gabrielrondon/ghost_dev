import { test, expect } from '@playwright/test'

test.describe('Token Proof Generation Flow', () => {
  test('should connect wallet and generate proof', async ({ page }) => {
    // Visit the homepage
    await page.goto('/')
    
    // Verify initial state
    await expect(page.getByText('Connect Wallet')).toBeVisible()
    await expect(page.getByText('Connect Stoic Wallet')).toBeVisible()
    await expect(page.getByText('Connect Plug Wallet')).toBeVisible()

    // Connect wallet (using Stoic for test)
    await page.getByText('Connect Stoic Wallet').click()
    
    // Wait for wallet connection
    await expect(page.getByText('Wallet Connected')).toBeVisible()
    
    // Verify token list is loaded
    await expect(page.getByText('Loading...')).toBeVisible()
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 })
    
    // Select a token
    const firstToken = page.locator('.cursor-pointer').first()
    await firstToken.click()
    
    // Verify proof generator is shown
    await expect(page.getByText('Generate Token Proof')).toBeVisible()
    
    // Generate proof
    await page.getByText('Generate Proof').click()
    
    // Verify success message
    await expect(page.getByText('Proof Generated Successfully')).toBeVisible()
  })

  test('should handle wallet connection errors', async ({ page }) => {
    await page.goto('/')
    
    // Mock wallet connection failure
    await page.route('**/*', (route) => {
      if (route.request().url().includes('ic0.app')) {
        route.abort()
      } else {
        route.continue()
      }
    })
    
    // Try to connect wallet
    await page.getByText('Connect Stoic Wallet').click()
    
    // Verify error message
    await expect(page.getByText('Connection Failed')).toBeVisible()
  })

  test('should handle proof generation errors', async ({ page }) => {
    await page.goto('/')
    
    // Connect wallet
    await page.getByText('Connect Stoic Wallet').click()
    await expect(page.getByText('Wallet Connected')).toBeVisible()
    
    // Select token
    const firstToken = page.locator('.cursor-pointer').first()
    await firstToken.click()
    
    // Mock proof generation failure
    await page.route('**/*', (route) => {
      if (route.request().url().includes('generate_proof')) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Proof generation failed' })
        })
      } else {
        route.continue()
      }
    })
    
    // Try to generate proof
    await page.getByText('Generate Proof').click()
    
    // Verify error message
    await expect(page.getByText('Error Generating Proof')).toBeVisible()
  })
}) 
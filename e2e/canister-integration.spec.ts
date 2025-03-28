import { test, expect } from '@playwright/test'
import { canisterService } from '../src/services/canister'

test.describe('Canister Integration', () => {
  test('should connect to wallet and interact with canister', async ({ page }) => {
    await page.goto('/')

    // 1. Connect wallet
    const connectButton = page.getByRole('button', { name: 'Connect Wallet' })
    await expect(connectButton).toBeVisible()
    await connectButton.click()
    
    // Wait for connection
    await expect(page.getByText('Connecting...')).toBeVisible()
    
    // 2. Check if proof generator form is visible
    const proofForm = page.getByTestId('proof-generator-form')
    await expect(proofForm).toBeVisible()
    
    // 3. Fill in proof generation inputs
    await page.getByLabel('Amount').fill('1.5')
    await page.getByLabel('Recipient').fill('test-recipient')
    
    // 4. Submit form
    await page.getByRole('button', { name: 'Generate Proof' }).click()
    
    // 5. Check for proof generation success
    await expect(page.getByText('Proof generated successfully')).toBeVisible()
  })

  test('should handle canister errors gracefully', async ({ page }) => {
    await page.goto('/')
    
    // 1. Connect wallet
    await page.getByRole('button', { name: 'Connect Wallet' }).click()
    
    // 2. Submit invalid input
    await page.getByLabel('Amount').fill('-1')  // Invalid amount
    await page.getByRole('button', { name: 'Generate Proof' }).click()
    
    // 3. Check for error message
    await expect(page.getByText('Invalid input parameters')).toBeVisible()
  })

  test('should verify existing proofs', async ({ page }) => {
    await page.goto('/')
    
    // 1. Navigate to verification page
    await page.goto('/#/verify/test-proof-id')
    
    // 2. Check verification UI
    const verificationSection = page.getByTestId('verification-section')
    await expect(verificationSection).toBeVisible()
    
    // 3. Verify the proof
    await page.getByRole('button', { name: 'Verify Proof' }).click()
    
    // 4. Check verification result
    await expect(page.getByText('Proof verified successfully')).toBeVisible()
  })
}) 
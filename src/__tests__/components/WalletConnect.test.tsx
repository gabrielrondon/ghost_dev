import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WalletConnect } from '@/components/WalletConnect'
import { useWallet } from '@/components/WalletContext'

// Mock the wallet context
vi.mock('@/components/WalletContext', () => ({
  useWallet: vi.fn(() => ({
    connect: vi.fn(() => Promise.resolve()),
    disconnect: vi.fn(),
    isConnecting: false,
    error: null,
    walletInfo: null,
  })),
}))

describe('WalletConnect', () => {
  it('renders connect button when not connected', () => {
    render(<WalletConnect />)
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()
  })

  it('shows loading state while connecting', () => {
    vi.mocked(useWallet).mockReturnValue({
      connect: vi.fn(() => Promise.resolve()),
      disconnect: vi.fn(),
      isConnecting: true,
      error: null,
      walletInfo: null,
    })

    render(<WalletConnect />)
    expect(screen.getByRole('button', { name: /connecting/i })).toBeDisabled()
  })

  it('shows error state when connection fails', () => {
    vi.mocked(useWallet).mockReturnValue({
      connect: vi.fn(() => Promise.resolve()),
      disconnect: vi.fn(),
      isConnecting: false,
      error: new Error('Connection failed'),
      walletInfo: null,
    })

    render(<WalletConnect />)
    expect(screen.getByText(/connection failed/i)).toBeInTheDocument()
  })
}) 
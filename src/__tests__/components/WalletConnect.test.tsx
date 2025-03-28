import { describe, it, expect, vi } from 'vitest'
import { render, within } from '@testing-library/react'
import { WalletConnect } from '@/components/WalletConnect'
import { useWallet, type WalletContextType } from '@/components/WalletContext'

// Mock the wallet context
vi.mock('@/components/WalletContext', () => {
  return {
    useWallet: vi.fn(() => ({
      isConnected: false,
      connect: vi.fn(() => Promise.resolve()),
      disconnect: vi.fn(),
      isConnecting: false,
      error: null,
      walletInfo: null
    }))
  }
})

describe('WalletConnect', () => {
  it('renders connect button when not connected', () => {
    const mockConnect = vi.fn().mockResolvedValue(undefined);
    
    // Update the mock to show connecting state
    vi.mocked(useWallet).mockReturnValue({
      isConnected: false,
      connect: mockConnect,
      disconnect: vi.fn(),
      isConnecting: true,
      error: null,
      walletInfo: null
    });
    
    const { container } = render(<WalletConnect />);
    
    // Verify connect button is present
    const connectButton = within(container).getByText(/connect/i);
    expect(connectButton).toBeInTheDocument();
  })

  it('shows error state when connection fails', () => {
    const mockError = new Error('Test error message');
    
    // Update the mock to show error state
    vi.mocked(useWallet).mockReturnValue({
      isConnected: false,
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      isConnecting: false,
      error: mockError,
      walletInfo: null
    });
    
    const { container } = render(<WalletConnect />);
    
    // Verify error message is displayed
    const errorMessage = within(container).getByText(/test error message/i);
    expect(errorMessage).toBeInTheDocument();
  })
}) 
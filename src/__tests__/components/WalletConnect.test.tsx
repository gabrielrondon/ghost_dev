import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, within } from '@testing-library/react'
import { WalletConnect } from '@/components/WalletConnect'
import { useWallet, type WalletContextType } from '@/components/WalletContext'

// Mock the dialog component to avoid errors with portal rendering in tests
vi.mock('@/components/ui/dialog', () => {
  return {
    Dialog: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog">{children}</div>,
    DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-header">{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-title">{children}</div>,
  }
})

// Mock the wallet selector component
vi.mock('@/components/WalletSelector', () => {
  return {
    WalletSelector: ({ onClose }: { onClose?: () => void }) => <div data-testid="wallet-selector">Wallet Options</div>
  }
})

// Mock the wallet context
vi.mock('@/components/WalletContext', () => {
  return {
    useWallet: vi.fn(() => ({
      isConnected: false,
      connect: vi.fn(() => Promise.resolve()),
      disconnect: vi.fn(),
      isConnecting: false,
      error: null,
      walletInfo: null,
      activeWallet: null
    }))
  }
})

describe('WalletConnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders connect button when not connected', () => {
    const mockConnect = vi.fn().mockResolvedValue(undefined);
    
    // Update the mock to show not connecting state
    vi.mocked(useWallet).mockReturnValue({
      isConnected: false,
      connect: mockConnect,
      disconnect: vi.fn(),
      isConnecting: false,
      error: null,
      walletInfo: null,
      activeWallet: null
    });
    
    const { container } = render(<WalletConnect />);
    
    // Verify button with the text "Connect" is present (use data-testid or a more specific selector)
    const connectButtons = within(container).getAllByRole('button');
    expect(connectButtons[0]).toHaveTextContent(/connect/i);
    expect(connectButtons[0]).toBeInTheDocument();
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
      walletInfo: null,
      activeWallet: null
    });
    
    const { container } = render(<WalletConnect />);
    
    // Verify error message is displayed
    const errorMessage = within(container).getByText(/test error message/i);
    expect(errorMessage).toBeInTheDocument();
  })
  
  it('handles crypto related errors gracefully', () => {
    // Create a specific crypto error similar to what we're seeing
    const cryptoError = new Error('Global crypto was not available and none was provided. Please include a SubtleCrypto implementation.');
    
    // Update the mock to show the crypto error
    vi.mocked(useWallet).mockReturnValue({
      isConnected: false,
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      isConnecting: false,
      error: cryptoError,
      walletInfo: null,
      activeWallet: null
    });
    
    const { container } = render(<WalletConnect />);
    
    // Verify a user-friendly error message is displayed (without exposing the technical details)
    const errorMessage = within(container).getByText(/connection failed/i);
    expect(errorMessage).toBeInTheDocument();
  })
}) 
import React from 'react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/components/WalletContext';

// SVG icons for wallets
const StoicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 48C37.2548 48 48 37.2548 48 24C48 10.7452 37.2548 0 24 0C10.7452 0 0 10.7452 0 24C0 37.2548 10.7452 48 24 48Z" fill="#F0F0F0"/>
    <path d="M11.856 29.0057H17.952L14.256 11.52H8.016L11.856 29.0057Z" fill="#19223C"/>
    <path d="M23.4239 11.52H17.4719L13.7759 29.0057H19.6559L23.4239 11.52Z" fill="#19223C"/>
    <path d="M29.088 19.248H23.424V24.72H29.088V19.248Z" fill="#19223C"/>
    <path d="M39.264 11.52H23.424V16.992H39.264V11.52Z" fill="#19223C"/>
    <path d="M39.264 32.496H23.424V37.968H39.264V32.496Z" fill="#19223C"/>
    <path d="M29.088 27.216H23.424V32.496H29.088V27.216Z" fill="#19223C"/>
    <path d="M39.264 19.248H32.112V32.496H39.264V19.248Z" fill="#19223C"/>
  </svg>
);

const PlugIcon = () => (
  <svg width="20" height="20" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M345.415 303.868H237.498C232.621 303.868 228.209 300.983 226.449 296.451L164.74 136.668C162.979 132.137 163.574 126.975 166.319 122.983C169.064 118.991 173.773 116.834 178.65 117.188L286.804 127.066C291.68 127.42 295.915 130.466 297.559 134.996L355.626 290.32C357.27 294.851 356.497 299.987 353.628 303.875C350.759 307.763 345.996 309.749 341.12 309.395L345.415 303.868Z" fill="#29ABE2"/>
    <path d="M370.132 382.502L309.094 390.587C304.218 391.124 299.372 388.94 296.627 384.888L226.45 296.452C224.868 294.385 223.977 291.947 223.855 289.447C223.732 286.947 224.383 284.443 225.73 282.233L296.689 164.26C299.434 160.207 304.049 157.904 308.925 158.258L369.963 166.343C374.84 166.698 379.075 169.743 380.719 174.274L438.559 329.174C440.203 333.704 439.242 338.855 436.162 342.686L380.718 412.309C378.978 414.536 376.677 416.272 374.059 417.338C371.442 418.405 368.593 418.768 365.792 418.389L370.132 382.502Z" fill="#29ABE2"/>
    <path d="M237.499 382.502L78.3591 365.7C73.4829 365.17 69.2478 362.125 67.6033 357.595L54.9219 325.151C53.2774 320.621 54.0498 315.485 56.9189 311.597L123.249 221.897C124.978 219.508 127.398 217.654 130.19 216.551C132.982 215.449 136.038 215.145 138.999 215.674L298.14 249.423C302.9 250.26 306.704 253.482 308.174 257.984L329.879 324.382C331.349 328.884 330.364 333.893 327.305 337.632L266.483 412.309C264.744 414.536 262.443 416.272 259.825 417.339C257.207 418.405 254.358 418.768 251.558 418.389L237.499 382.502Z" fill="#29ABE2"/>
  </svg>
);

export type WalletType = 'stoic' | 'plug';

interface WalletOption {
  id: WalletType;
  name: string;
  icon: React.ReactNode;
  available: boolean;
  comingSoon?: boolean;
}

// Read environment variables to determine wallet availability
const isStoicEnabled = import.meta.env.VITE_ENABLE_STOIC === 'true';
const isPlugEnabled = import.meta.env.VITE_ENABLE_PLUG === 'true';

const walletOptions: WalletOption[] = [
  {
    id: 'stoic',
    name: 'Stoic Wallet',
    icon: <StoicIcon />,
    available: isStoicEnabled
  },
  {
    id: 'plug',
    name: 'Plug Wallet',
    icon: <PlugIcon />,
    available: isPlugEnabled,
    comingSoon: !isPlugEnabled
  }
];

interface WalletSelectorProps {
  onClose?: () => void;
  className?: string;
}

export function WalletSelector({ onClose, className = '' }: WalletSelectorProps) {
  const { connect, isConnecting } = useWallet();

  const handleConnectWallet = async (walletType: WalletType) => {
    const selectedWallet = walletOptions.find(opt => opt.id === walletType);
    
    if (!selectedWallet?.available) {
      return;
    }
    
    await connect(walletType);
    if (onClose) onClose();
  };

  return (
    <div className={`flex flex-col gap-4 p-4 ${className}`}>
      <h2 className="text-lg font-medium mb-2">Connect Wallet</h2>
      <div className="grid gap-3">
        {walletOptions.map((wallet) => (
          <Button
            key={wallet.id}
            variant={wallet.available ? "default" : "outline"}
            className="w-full justify-start gap-3 py-6"
            onClick={() => handleConnectWallet(wallet.id)}
            disabled={isConnecting || !wallet.available}
          >
            <span className="flex items-center gap-2">
              {wallet.icon}
              {wallet.name}
            </span>
            {wallet.comingSoon && (
              <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                Coming Soon
              </span>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
} 
import { Toaster } from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#2D3748',
            color: '#E2E8F0',
            borderColor: '#4A5568'
          }
        }}
      />
    </>
  )
} 
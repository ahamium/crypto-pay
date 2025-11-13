'use client';

import { WagmiConfig, createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from '@wagmi/connectors';
import { walletConnect } from '@wagmi/connectors';

const queryClient = new QueryClient();

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID; // optional
const connectors = [injected(), ...(projectId ? [walletConnect({ projectId })] : [])];

const config = createConfig({
  chains: [sepolia],
  transports: { [sepolia.id]: http() }, // default RPC (브라우저에서 읽기만)
  connectors,
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiConfig>
  );
}

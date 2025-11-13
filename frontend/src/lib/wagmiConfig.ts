import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { walletConnect } from '@wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const connectors = [injected(), ...(projectId ? [walletConnect({ projectId })] : [])];

export const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: { [sepolia.id]: http() },
  connectors,
});

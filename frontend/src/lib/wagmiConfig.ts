import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
  connectors: [
    injected(),
    ...(projectId
      ? [
          walletConnect({
            projectId,
            showQrModal: true,
            metadata: {
              name: 'Crypto Pay Gateway',
              description: 'Crypto payment gateway demo',
              url: 'https://app-crypto-pay-fe.azurewebsites.net',
              icons: ['https://app-crypto-pay-fe.azurewebsites.net/favicon.ico'],
            },
          }),
        ]
      : []),
  ],
});

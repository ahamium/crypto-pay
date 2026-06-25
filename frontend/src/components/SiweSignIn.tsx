'use client';

import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { SiweMessage } from 'siwe';
import { useMemo, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const EXPECTED_CHAIN_ID = 11155111; // Sepolia

function shortAddress(address?: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function getMetaMaskMobileDeepLink() {
  if (typeof window === 'undefined') return '#';

  const urlWithoutProtocol = window.location.href.replace(/^https?:\/\//, '');
  return `https://link.metamask.io/dapp/${urlWithoutProtocol}`;
}

function hasInjectedWallet() {
  if (typeof window === 'undefined') return false;
  return Boolean((window as Window & { ethereum?: unknown }).ethereum);
}

export default function SiweSignIn() {
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, error: connectError, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [jwt, setJwt] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('jwt') : null,
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const walletInstalled = useMemo(() => hasInjectedWallet(), []);

  async function handleLogin() {
    if (!address || !chainId) {
      setMessage('Connect your wallet first.');
      return;
    }

    if (chainId !== EXPECTED_CHAIN_ID) {
      setMessage('Please switch your wallet network to Sepolia first.');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const nonceRes = await fetch(`${API}/auth/nonce?address=${address}`);

      if (!nonceRes.ok) {
        throw new Error(`Failed to get nonce: ${await nonceRes.text()}`);
      }

      const { nonce } = (await nonceRes.json()) as { nonce: string };

      const siwe = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Crypto Pay',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
      });

      const preparedMessage = siwe.prepareMessage();

      const signature = await signMessageAsync({ message: preparedMessage });

      const verifyRes = await fetch(`${API}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: preparedMessage, signature, domain: window.location.host }),
      });

      if (!verifyRes.ok) {
        throw new Error(`Login failed: ${await verifyRes.text()}`);
      }

      const data = (await verifyRes.json()) as {
        token: string;
        user: { address: string };
      };

      setJwt(data.token);
      localStorage.setItem('jwt', data.token);
      setMessage(`Signed in as ${data.user.address}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleDisconnect() {
    disconnect();
    setJwt(null);
    localStorage.removeItem('jwt');
    setMessage('Disconnected.');
  }

  return (
    <div
      style={{
        display: 'grid',
        gap: 16,
        maxWidth: 560,
        border: '1px solid #ddd',
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div>
        <h2 style={{ marginTop: 0 }}>Wallet Login</h2>
        <p style={{ lineHeight: 1.6, color: '#444' }}>
          Connect a wallet and sign a message to log in. On desktop, install the MetaMask extension.
          On mobile, open this page in the MetaMask app or use WalletConnect.
        </p>
      </div>

      {!isConnected ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {connectors.length > 0 ? (
            connectors.map((connector) => (
              <button
                key={`${connector.id}-${connector.name}`}
                onClick={() => {
                  setMessage(null);
                  connect({ connector });
                }}
                disabled={isConnecting}
                style={{
                  padding: '10px 14px',
                  cursor: isConnecting ? 'not-allowed' : 'pointer',
                }}
              >
                {isConnecting ? 'Connecting...' : `Connect with ${connector.name}`}
              </button>
            ))
          ) : (
            <p style={{ color: 'crimson' }}>No wallet connector is available.</p>
          )}

          {!walletInstalled && (
            <div
              style={{
                display: 'grid',
                gap: 8,
                padding: 12,
                background: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: 8,
              }}
            >
              <strong>No browser wallet detected.</strong>
              <span style={{ lineHeight: 1.5 }}>
                If you are on desktop, install MetaMask. If you are on mobile, open this dApp in the
                MetaMask app.
              </span>

              <a
                href={getMetaMaskMobileDeepLink()}
                style={{
                  display: 'inline-block',
                  padding: '10px 14px',
                  border: '1px solid #ccc',
                  borderRadius: 6,
                  textAlign: 'center',
                  color: 'black',
                  textDecoration: 'none',
                  background: 'white',
                }}
              >
                Open in MetaMask Mobile
              </a>

              <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">
                Install MetaMask
              </a>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <div>
              Connected: <strong>{shortAddress(address)}</strong>
            </div>
            <div>
              Network:{' '}
              <strong style={{ color: chainId === EXPECTED_CHAIN_ID ? 'green' : 'crimson' }}>
                {chainId === EXPECTED_CHAIN_ID ? 'Sepolia' : `Wrong network (${chainId})`}
              </strong>
            </div>
          </div>

          {chainId !== EXPECTED_CHAIN_ID && (
            <p style={{ color: 'crimson', margin: 0 }}>
              Please switch your wallet network to Sepolia before signing in.
            </p>
          )}

          <button onClick={handleLogin} disabled={loading || chainId !== EXPECTED_CHAIN_ID}>
            {loading ? 'Signing in...' : jwt ? 'Sign-In Again' : 'Sign-In with Ethereum'}
          </button>

          <button onClick={handleDisconnect}>Disconnect</button>

          {jwt && (
            <div
              style={{
                display: 'grid',
                gap: 8,
                marginTop: 12,
                padding: 12,
                border: '1px solid #d9f7be',
                background: '#f6ffed',
                borderRadius: 8,
              }}
            >
              <strong>Login complete. Choose your next step:</strong>

              <Link
                href="/pay"
                style={{
                  display: 'block',
                  padding: '10px 14px',
                  border: '1px solid #ccc',
                  borderRadius: 6,
                  textAlign: 'center',
                  textDecoration: 'none',
                  color: 'black',
                  background: 'white',
                }}
              >
                Go to Payment Page
              </Link>

              <Link
                href="/admin"
                style={{
                  display: 'block',
                  padding: '10px 14px',
                  border: '1px solid #ccc',
                  borderRadius: 6,
                  textAlign: 'center',
                  textDecoration: 'none',
                  color: 'black',
                  background: 'white',
                }}
              >
                Go to Admin Dashboard
              </Link>
            </div>
          )}
        </div>
      )}

      {connectError && <p style={{ color: 'crimson' }}>{connectError.message}</p>}

      {message && (
        <p
          style={{
            color: message.toLowerCase().includes('failed') ? 'crimson' : '#333',
            whiteSpace: 'pre-wrap',
          }}
        >
          {message}
        </p>
      )}

      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
        API: <code>{API}</code>
      </div>
    </div>
  );
}

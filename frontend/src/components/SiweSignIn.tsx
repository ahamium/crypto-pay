'use client';

import { useAccount, useConnect, useDisconnect, useSignMessage, useSwitchChain } from 'wagmi';
import { SiweMessage } from 'siwe';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { sepolia } from 'wagmi/chains';

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const EXPECTED_CHAIN_ID = sepolia.id; // 11155111

const cardStyle: CSSProperties = {
  display: 'grid',
  gap: 16,
  width: '100%',
  maxWidth: 560,
  minWidth: 0,
  border: '1px solid #ddd',
  borderRadius: 12,
  padding: 20,
  boxSizing: 'border-box',
  overflow: 'hidden',
};

const fullButtonStyle: CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
  padding: '10px 14px',
};

const fullLinkButtonStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
  padding: '10px 14px',
  border: '1px solid #ccc',
  borderRadius: 6,
  textAlign: 'center',
  textDecoration: 'none',
  color: 'black',
  background: 'white',
};

const breakTextStyle: CSSProperties = {
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
};

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

function isMobile() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function connectorLabel(connector: { id?: string; name?: string }) {
  const id = (connector.id ?? '').toLowerCase();
  const name = (connector.name ?? '').toLowerCase();

  if (id.includes('walletconnect') || name.includes('walletconnect')) {
    return 'Connect with WalletConnect';
  }

  if (id.includes('injected') || name.includes('injected')) {
    return 'Connect with MetaMask Extension';
  }

  return `Connect with ${connector.name ?? 'Wallet'}`;
}

function isInjectedConnector(connector: { id?: string; name?: string }) {
  const id = (connector.id ?? '').toLowerCase();
  const name = (connector.name ?? '').toLowerCase();

  return id.includes('injected') || name.includes('injected');
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (err) {
    if (timedOut) {
      throw new Error('Request timed out. The backend may be waking up. Please try again.');
    }

    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request was cancelled. Please try again.');
    }

    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export default function SiweSignIn() {
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, error: connectError, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();

  const loginRunIdRef = useRef(0);

  const [jwt, setJwt] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('jwt') : null,
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [readyToSign, setReadyToSign] = useState(false);

  const walletInstalled = useMemo(() => hasInjectedWallet(), []);
  const mobile = useMemo(() => isMobile(), []);

  useEffect(() => {
    if (!isConnected || !address) {
      setReadyToSign(false);
      return;
    }

    setReadyToSign(false);

    const timer = setTimeout(() => {
      setReadyToSign(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isConnected, address, chainId]);

  const visibleConnectors = useMemo(() => {
    return connectors.filter((connector) => {
      // 모바일 일반 브라우저나 지갑 없는 브라우저에서는 injected가 안 먹음.
      // provider 없으면 숨겨서 "Provider not found"를 피함.
      if (isInjectedConnector(connector) && !walletInstalled) {
        return false;
      }

      return true;
    });
  }, [connectors, walletInstalled]);

  const isWrongNetwork = isConnected && chainId !== EXPECTED_CHAIN_ID;

  function resetLoginState() {
    loginRunIdRef.current += 1;
    setLoading(false);
    setMessage('Login attempt was reset. Try signing in again.');
  }

  async function switchToSepolia() {
    setMessage(null);

    try {
      await switchChainAsync({ chainId: EXPECTED_CHAIN_ID });
      setMessage('Switched to Sepolia. You can sign in now.');
    } catch {
      setMessage(
        [
          'Could not switch automatically.',
          '',
          'Please open your wallet and switch or add Sepolia manually:',
          'Network: Sepolia',
          'Chain ID: 11155111',
          'Currency: ETH',
          'Explorer: https://sepolia.etherscan.io',
        ].join('\n'),
      );
    }
  }

  async function handleLogin() {
    if (loading) return;

    if (!address || !chainId) {
      setMessage('Connect your wallet first.');
      return;
    }

    if (!readyToSign) {
      setMessage('Wallet connected. Please wait a moment, then sign in.');
      return;
    }

    if (chainId !== EXPECTED_CHAIN_ID) {
      setMessage('Please switch your wallet network to Sepolia first.');
      return;
    }

    const runId = loginRunIdRef.current + 1;
    loginRunIdRef.current = runId;
    const isCurrentRun = () => loginRunIdRef.current === runId;

    setLoading(true);
    setMessage('Preparing sign-in request...');

    try {
      const nonceRes = await fetchWithTimeout(`${API}/auth/nonce?address=${address}`, {}, 45000);

      if (!isCurrentRun()) return;

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

      setMessage('Waiting for wallet signature. Check MetaMask or WalletConnect.');

      const signature = await signMessageAsync({ message: preparedMessage });

      if (!isCurrentRun()) return;

      setMessage('Verifying signature...');

      const verifyRes = await fetchWithTimeout(
        `${API}/auth/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: preparedMessage,
            signature,
            domain: window.location.host,
          }),
        },
        45000,
      );

      if (!isCurrentRun()) return;

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
      if (!isCurrentRun()) return;

      let msg = err instanceof Error ? err.message : 'Login failed';

      if (msg.includes('signal is aborted') || msg.includes('aborted without reason')) {
        msg = 'Request was cancelled or timed out. Please try again.';
      }

      if (msg.includes('User rejected') || msg.includes('user rejected')) {
        msg = 'The request was rejected in the wallet.';
      }

      if (msg.includes('wallet_requestPermissions') && msg.includes('already pending')) {
        msg =
          'A MetaMask connection request is already pending. Open MetaMask and approve or cancel it, then try again.';
      }

      setMessage(msg);
    } finally {
      if (isCurrentRun()) {
        setLoading(false);
      }
    }
  }

  function handleDisconnect() {
    loginRunIdRef.current += 1;
    disconnect();
    setJwt(null);
    setLoading(false);
    localStorage.removeItem('jwt');
    setMessage('Disconnected.');
  }

  return (
    <div style={cardStyle}>
      <div>
        <h2 style={{ marginTop: 0 }}>Wallet Login</h2>
        <p style={{ lineHeight: 1.6, color: '#444' }}>
          Connect a wallet and sign a message to log in. On desktop, use the MetaMask extension. On
          mobile, WalletConnect is recommended.
        </p>
      </div>

      {!isConnected ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {mobile && (
            <div
              style={{
                padding: 12,
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 8,
                lineHeight: 1.5,
              }}
            >
              <strong>Mobile tip:</strong> Tap <strong>WalletConnect</strong>, then choose MetaMask.
              If your wallet is on Mainnet, switch to Sepolia before signing in.
            </div>
          )}

          {visibleConnectors.length > 0 ? (
            visibleConnectors.map((connector) => (
              <button
                key={`${connector.id}-${connector.name}`}
                onClick={() => {
                  setMessage(null);
                  connect({ connector });
                }}
                disabled={isConnecting}
                style={{
                  ...fullButtonStyle,
                  cursor: isConnecting ? 'not-allowed' : 'pointer',
                }}
              >
                {isConnecting ? 'Connecting...' : connectorLabel(connector)}
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
                On desktop, install MetaMask. On mobile, use WalletConnect or open this dApp inside
                MetaMask.
              </span>

              <a href={getMetaMaskMobileDeepLink()} style={fullLinkButtonStyle}>
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

          {isConnected && !jwt && !isWrongNetwork && (
            <p style={{ margin: 0, color: '#555' }}>
              Wallet connected. Now click “Sign-In with Ethereum” to complete login.
            </p>
          )}

          {isWrongNetwork && (
            <div
              style={{
                display: 'grid',
                gap: 8,
                padding: 12,
                border: '1px solid #ffccc7',
                background: '#fff1f0',
                borderRadius: 8,
              }}
            >
              <strong>Please switch to Sepolia before signing in.</strong>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                This demo only supports Sepolia testnet. Chain ID must be 11155111.
              </p>

              <button onClick={switchToSepolia} disabled={isSwitching} style={fullButtonStyle}>
                {isSwitching ? 'Switching...' : 'Switch to Sepolia'}
              </button>

              <details>
                <summary>Manual Sepolia settings</summary>
                <div style={{ marginTop: 8, lineHeight: 1.6 }}>
                  <div>Network name: Sepolia</div>
                  <div>Chain ID: 11155111</div>
                  <div>Currency symbol: ETH</div>
                  <div>Explorer: https://sepolia.etherscan.io</div>
                </div>
              </details>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || isWrongNetwork || !readyToSign}
            style={fullButtonStyle}
          >
            {loading
              ? 'Signing in...'
              : !readyToSign
                ? 'Preparing wallet...'
                : jwt
                  ? 'Sign-In Again'
                  : 'Sign-In with Ethereum'}
          </button>

          {loading && (
            <button type="button" onClick={resetLoginState} style={fullButtonStyle}>
              Cancel / Reset Login
            </button>
          )}

          <button onClick={handleDisconnect} style={fullButtonStyle}>
            Disconnect
          </button>

          {jwt && !isWrongNetwork && (
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

              <Link href="/pay" style={fullLinkButtonStyle}>
                Go to Payment Page
              </Link>

              <Link href="/admin" style={fullLinkButtonStyle}>
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
            color:
              message.toLowerCase().includes('failed') ||
              message.toLowerCase().includes('timed out') ||
              message.toLowerCase().includes('could not')
                ? 'crimson'
                : '#333',
            whiteSpace: 'pre-wrap',
            ...breakTextStyle,
          }}
        >
          {message}
        </p>
      )}

      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5, ...breakTextStyle }}>
        API: <code>{API}</code>
      </div>
    </div>
  );
}

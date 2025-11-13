'use client';

import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { injected } from '@wagmi/connectors';
import { SiweMessage } from 'siwe';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export default function SiweSignIn() {
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [jwt, setJwt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!address || !chainId) return;

    setLoading(true);
    try {
      // 1) 서버에서 nonce 발급
      const nonceRes = await fetch(`${API}/auth/nonce?address=${address}`);
      const { nonce } = await nonceRes.json();

      // 2) SIWE 메시지 구성
      const msg = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Crypto Pay',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
      });
      const message = msg.prepareMessage();

      // 3) 지갑으로 서명
      const signature = await signMessageAsync({ message });

      // 4) 서버 검증 → JWT
      const verifyRes = await fetch(`${API}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature, domain: window.location.host }),
      });
      if (!verifyRes.ok) throw new Error(await verifyRes.text());
      const data = await verifyRes.json();
      setJwt(data.token);
      localStorage.setItem('jwt', data.token);
      alert(`Signed in as ${data.user.address}`);
    } catch (e: any) {
      alert(e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {!isConnected ? (
        <button onClick={() => connect({ connector: injected() })} disabled={isConnecting}>
          Connect Wallet
        </button>
      ) : (
        <>
          <span>
            Connected: {address?.slice(0, 6)}…{address?.slice(-4)}
          </span>
          <button onClick={handleLogin} disabled={loading}>
            Sign-In with Ethereum
          </button>
          <button
            onClick={() => {
              disconnect();
              setJwt(null);
              localStorage.removeItem('jwt');
            }}
          >
            Disconnect
          </button>
        </>
      )}
    </div>
  );
}

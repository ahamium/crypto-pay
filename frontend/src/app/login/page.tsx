import SiweSignIn from '@/components/SiweSignIn';

export default function Page() {
  return (
    <main
      style={{
        padding: '24px 16px',
        width: '100%',
        maxWidth: 760,
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      <h1 style={{ lineHeight: 1.15 }}>Sign-In with Ethereum</h1>
      <SiweSignIn />
    </main>
  );
}

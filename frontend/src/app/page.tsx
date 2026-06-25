import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: 32, maxWidth: 900, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Crypto Pay Gateway</h1>

      <p style={{ fontSize: 18, lineHeight: 1.6 }}>
        A full-stack crypto payment gateway MVP built with Next.js, NestJS, Prisma, Hardhat,
        Solidity, Docker, GitHub Actions, GHCR, and Azure App Service.
      </p>

      <section style={{ marginTop: 32 }}>
        <h2>Demo Pages</h2>

        <ul style={{ lineHeight: 2 }}>
          <li>
            <Link href="/login">Sign-In with Ethereum</Link>
          </li>
          <li>
            <Link href="/pay">Create / Pay Invoice</Link>
          </li>
          <li>
            <Link href="/admin">Admin Dashboard</Link>
          </li>
          <li>
            <a href="https://app-crypto-pay-be.azurewebsites.net/health" target="_blank">
              Backend Health Check
            </a>
          </li>
        </ul>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Features</h2>
        <ul style={{ lineHeight: 1.8 }}>
          <li>Wallet login with Sign-In with Ethereum</li>
          <li>Invoice creation API</li>
          <li>Sepolia PaymentGateway smart contract integration</li>
          <li>Transaction verification backend</li>
          <li>Admin payment dashboard</li>
          <li>Dockerized CI/CD deployment to Azure App Service</li>
        </ul>
      </section>
    </main>
  );
}

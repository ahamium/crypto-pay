# Crypto Pay Monorepo

![CI](https://github.com/ahamium/crypto-pay/actions/workflows/ci.yml/badge.svg)

Demo of an **on-chain payment MVP** using a modern stack (Next.js 15, NestJS, PNPM workspaces, Docker/Compose, EVM RPC).  
Runs frontend & backend together in local containers, deployable to Azure.

## ✨ Features (MVP)

- Wallet connection (e.g., WalletConnect) and network display
- Test token transfer/payment flow (RPC calls from backend)
- Transaction status lookup / simple receipt
- Health check and basic logging

## 🧰 Tech Stack

- **Frontend:** Next.js (App Router), TypeScript
- **Backend:** NestJS, TypeScript
- **Blockchain:** ethers.js (EVM RPC, Sepolia)
- **Tooling:** PNPM (workspace), ESLint/Prettier, Docker + Compose
- **Infra (optional):** Azure (ACR + App Service/AKS), App Insights

## 📁 Monorepo Structure

crypto-pay/
├─ frontend/ # Next.js App Router
├─ backend/ # NestJS API
├─ ops/ # docker-compose.yml, .env
└─ ... # config, docs 등

## 🧪 Quick Start (Local)

### 0) Prerequisites

- WSL2 + Ubuntu, Docker Desktop (with WSL integration)
- Node.js 20+, PNPM (`corepack enable`)
- (Optional) Infura/Alchemy RPC key

### 1) Environment Variables

```bash
cp ops/.env.example ops/.env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2) Run with Docker

cd ops
docker compose up --build

# http://localhost:3000 (Frontend)

# http://localhost:5000/health (Backend)

## Architecture Diagram

flowchart LR
A[User Browser] --> B[Next.js (Frontend)]
B -- REST/JSON --> C[NestJS (Backend)]
C -- RPC (ethers.js) --> D[(EVM RPC<br/>Sepolia/Infura)]
C -- DB (optional) --> E[(Postgres)]

subgraph Local (Docker Compose)
B
C
end

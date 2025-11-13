import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.tokenWhitelist.upsert({
    where: {
      chainId_tokenAddress: {
        chainId: 11155111,
        tokenAddress: '0x0000000000000000000000000000000000000000',
      },
    },
    update: {},
    create: {
      chainId: 11155111,
      tokenAddress: '0x0000000000000000000000000000000000000000',
      tokenSymbol: 'ETH',
      decimals: 18,
      enabled: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

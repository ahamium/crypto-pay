import { ethers } from 'hardhat';

async function main() {
  const [owner] = await ethers.getSigners();
  const gatewayAddr = process.env.GATEWAY!;
  const token = process.env.TOKEN!; // "0x000...000" == native
  const allowed = process.env.ALLOWED === 'true';

  const g = await ethers.getContractAt('PaymentGateway', gatewayAddr, owner);
  const tx = await g.setAllowedToken(token, allowed);
  console.log('tx:', tx.hash);
  await tx.wait();
  console.log('allowed set');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

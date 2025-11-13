// scripts/deploy.ts  (Hardhat 2 + ethers v5)
import { ethers, artifacts } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();

  const balWei = await ethers.provider.getBalance(deployerAddr);
  console.log("Deployer:", deployerAddr, "Balance(wei):", balWei.toString());

  const Gateway = await ethers.getContractFactory("PaymentGateway");
  const gateway = await Gateway.deploy(deployerAddr);

  // ethers v6
  await gateway.waitForDeployment();

  let address: string;
  address = await (gateway as any).getAddress();

  console.log("PaymentGateway deployed to:", address);

  // export addresses.json (for backend/frontend to consume)
  // Save contract address into addresses.json so that backend/frontend knows where the deployed contract lives
  const outDir = path.resolve(__dirname, "../artifacts-export");
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, "addresses.json"),
    JSON.stringify({ PaymentGateway: address }, null, 2)
  );

  // also export ABI
  // Extract ABI from artifacts and save to artifacts-export/PaymentGateway.abi.json
  const artifact = await artifacts.readArtifact("PaymentGateway");
  fs.writeFileSync(
    path.join(outDir, "PaymentGateway.abi.json"),
    JSON.stringify(artifact.abi, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

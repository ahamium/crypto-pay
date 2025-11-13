import * as fs from 'fs';
import * as path from 'path';

const srcDir = path.resolve(__dirname, '../artifacts-export');
const backendDstDir = path.resolve(__dirname, '../../backend/src/contracts');
const frontendDstDir = path.resolve(__dirname, '../../frontend/src/contracts');

fs.mkdirSync(backendDstDir, { recursive: true });
fs.mkdirSync(frontendDstDir, { recursive: true });

for (const f of ['PaymentGateway.abi.json', 'addresses.json']) {
  const srcPath = path.join(srcDir, f);
  const backendDstPath = path.join(backendDstDir, f);
  const frontendDstPath = path.join(frontendDstDir, f);

  fs.copyFileSync(srcPath, backendDstPath);
  console.log(`copied to backend: ${f}`);

  fs.copyFileSync(srcPath, frontendDstPath);
  console.log(`copied to frontend: ${f}`);
}

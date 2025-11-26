import { Module } from '@nestjs/common';
import { KeyVaultService } from './keyvault.service';

@Module({
  providers: [KeyVaultService],
  exports: [KeyVaultService], // 다른 모듈에서 쓸 수 있게 export
})
export class SecurityModule {}

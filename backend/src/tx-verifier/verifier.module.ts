import { Module } from '@nestjs/common';
import { VerifierService } from './verifier.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [VerifierService, PrismaService],
})
export class VerifierModule {}

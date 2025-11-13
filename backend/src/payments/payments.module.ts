import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from 'src/security/audit-log.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService, AuditLogService],
})
export class PaymentsModule {}

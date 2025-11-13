import { Module } from '@nestjs/common';
import { AdminPaymentsController } from './admin-payments.controller';
import { AdminPaymentsService } from './admin-payments.service';
import { PrismaService } from '../prisma.service';
import { AdminGuard } from '../auth/admin.guard';
import { AuditLogService } from 'src/security/audit-log.service';

@Module({
  controllers: [AdminPaymentsController],
  providers: [AdminPaymentsService, PrismaService, AdminGuard, AuditLogService],
})
export class AdminModule {}

import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AdminPaymentsService } from './admin-payments.service';
import { AdminGuard } from '../auth/admin.guard';
import { AdminPaymentsQuery } from './dto/admin-payments.query';
import { AuditLogService } from 'src/security/audit-log.service';
import type { ReqWithUser } from '../security/audit-log.service';
// import { ValidateNested } from 'class-validator';
// import { Type } from 'class-transformer';

// class QueryWrapper {
//   @ValidateNested() @Type(() => AdminPaymentsQuery) query!: AdminPaymentsQuery;
// }

@UseGuards(AdminGuard)
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(
    private svc: AdminPaymentsService,
    private readonly audit: AuditLogService,
  ) {}

  @Get()
  async list(@Query() q: AdminPaymentsQuery) {
    return this.svc.list(q);
  }

  @Get('export.csv')
  async csv(
    @Query() q: AdminPaymentsQuery,
    @Res() res: Response,
    @Req() req: ReqWithUser,
  ) {
    // ✅ 감사 로그 남기기
    await this.audit.record(
      'ADMIN_EXPORT_PAYMENTS_CSV',
      { target: 'payments', query: q },
      req,
    );
    const csv = await this.svc.exportCsv(q);
    res.setHeader('content-type', 'text/csv; charset=utf-8');
    res.setHeader('content-disposition', 'attachment; filename="payments.csv"');
    res.send(csv);
  }
}

import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AdminPaymentsService } from './admin-payments.service';
import { AdminGuard } from '../auth/admin.guard';
import { AdminPaymentsQuery } from './dto/admin-payments.query';
import { AuditLogService } from 'src/security/audit-log.service';
import type { ReqWithUser } from '../security/audit-log.service';

@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(
    private svc: AdminPaymentsService,
    private readonly audit: AuditLogService,
  ) {}

  // Public read-only demo endpoint.
  // Visitors can inspect payment records, but cannot perform operational actions.
  @Get()
  async list(@Query() q: AdminPaymentsQuery) {
    return this.svc.list(q);
  }

  // Protected operational action.
  // CSV export requires admin wallet authentication.
  @UseGuards(AdminGuard)
  @Get('export.csv')
  async csv(
    @Query() q: AdminPaymentsQuery,
    @Res() res: Response,
    @Req() req: ReqWithUser,
  ) {
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

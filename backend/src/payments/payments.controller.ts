import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuditLogService } from 'src/security/audit-log.service';
import type { ReqWithUser } from 'src/security/audit-log.service';

@Controller('api/payments')
export class PaymentsController {
  constructor(
    private readonly svc: PaymentsService,
    private readonly audit: AuditLogService,
  ) {}

  // Optional auth: allow anonymous invoices or require JWT — choose one
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Body() dto: CreateInvoiceDto, @Req() req: ReqWithUser) {
    const userId = (req as { user?: { userId: number } }).user?.userId; // from JwtStrategy

    // ✅ 감사 로그 남기기
    await this.audit.record('CREATE_INVOICE', { dto }, req);

    return this.svc.createInvoice(dto, userId);
  }

  @Get(':invoiceId')
  async get(@Param('invoiceId') invoiceId: string) {
    return this.svc.getInvoice(invoiceId);
  }

  @Patch(':invoiceId/confirm')
  async confirm(
    @Param('invoiceId') invoiceId: string,
    @Body() body: { txHash: string },
    @Req() req: ReqWithUser,
  ) {
    // ✅ 결제 확인 로그
    await this.audit.record(
      'CONFIRM_PAYMENT',
      { invoiceId, txHash: body.txHash },
      req,
    );

    return this.svc.confirmPayment(invoiceId, body.txHash);
  }
}

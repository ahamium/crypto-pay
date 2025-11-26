import { Injectable } from '@nestjs/common';
import { AdminPaymentsQuery } from './dto/admin-payments.query';
import { PrismaService } from 'src/prisma.service';

type InvoiceWhereInput = {
  [key: string]: any;
};

type InvoiceOrderByInput =
  | { [field: string]: 'asc' | 'desc' | undefined }
  | Array<{ [field: string]: 'asc' | 'desc' | undefined }>;

@Injectable()
export class AdminPaymentsService {
  constructor(private prisma: PrismaService) {}

  buildWhere(q: AdminPaymentsQuery): InvoiceWhereInput {
    const where: InvoiceWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.chainId) where.chainId = q.chainId;
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = new Date(q.from);
      if (q.to) where.createdAt.lte = new Date(q.to);
    }
    if (q.q) {
      const needle = q.q.toLowerCase();
      where.OR = [
        { invoiceId: { contains: needle } },
        { payerAddress: { contains: needle } },
        { toAddress: { contains: needle } },
        { tokenSymbol: { contains: needle } },
      ];
    }
    return where;
  }

  async list(q: AdminPaymentsQuery) {
    const where = this.buildWhere(q);
    const skip = (q.page! - 1) * q.pageSize!;
    const orderBy: InvoiceOrderByInput = {
      [q.sortBy!]: q.sortDir,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: q.pageSize,
        orderBy,
        select: {
          id: true,
          invoiceId: true,
          status: true,
          chainId: true,
          tokenSymbol: true,
          amount: true,
          toAddress: true,
          payerAddress: true,
          txHash: true,
          confirmations: true,
          createdAt: true,
          confirmedAt: true,
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items: items.map((x) => ({ ...x, amount: x.amount.toString() })),
      total,
      page: q.page,
      pageSize: q.pageSize,
    };
  }

  async exportCsv(q: AdminPaymentsQuery): Promise<string> {
    const { items } = await this.list({ ...q, page: 1, pageSize: 5000 });
    const header = [
      'invoiceId',
      'status',
      'chainId',
      'tokenSymbol',
      'amount',
      'toAddress',
      'payerAddress',
      'txHash',
      'confirmations',
      'createdAt',
      'confirmedAt',
    ];
    const lines = [
      header.join(','),
      ...items.map((i) =>
        [
          i.invoiceId,
          i.status,
          i.chainId,
          i.tokenSymbol,
          i.amount,
          i.toAddress,
          i.payerAddress ?? '',
          i.txHash ?? '',
          i.confirmations ?? 0,
          new Date(i.createdAt).toISOString(),
          i.confirmedAt ? new Date(i.confirmedAt).toISOString() : '',
        ]
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(','),
      ),
    ];
    return lines.join('\n');
  }
}

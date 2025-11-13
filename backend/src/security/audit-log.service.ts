import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { Request } from 'express';

type JwtUser = { userId?: number; address?: string };
export type ReqWithUser = Request & { user?: JwtUser };

interface AuditMeta {
  target?: string;
  // 여기에 자유롭게 추가되는 필드들 허용
  [key: string]: any;
}

@Injectable()
export class AuditLogService {
  private readonly log = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(
    action: string,
    meta: AuditMeta = {},
    req?: ReqWithUser,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          target: meta.target ?? null,
          actorId: req?.user?.userId ?? null,
          actorAddr: req?.user?.address ?? null,
          ip: req?.ip ?? null,
          meta,
        },
      });
    } catch (e) {
      // 감사 로그 실패했다고 본 요청을 막으면 안 되니까, 경고만 남기고 끝냄
      this.log.warn(`audit fail: ${String(e)}`);
    }
  }
}

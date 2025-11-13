import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// JWT validate()가 넣어주는 형태에 맞춰 타입 정의
type JwtUser = { userId: number; address: string };

// Request에 user 타입을 얹어줌
type ReqWithUser = Request & { user?: JwtUser };

function parseAdmins() {
  const s = process.env.ADMIN_ADDRESSES ?? '';
  return s
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

@Injectable()
export class AdminGuard
  extends (AuthGuard('jwt') as { new (): any })
  implements CanActivate
{
  async canActivate(ctx: ExecutionContext) {
    // 1) JWT 인증
    if (!(await (super.canActivate(ctx) as Promise<boolean>))) {
      throw new UnauthorizedException();
    }

    // 2) 관리자 화이트리스트
    const req = ctx.switchToHttp().getRequest<ReqWithUser>();
    const addr = (req.user?.address ?? '').toLowerCase();
    const admins = parseAdmins();

    if (!addr || !admins.includes(addr)) {
      throw new ForbiddenException('admin only');
    }
    return true;
  }
}

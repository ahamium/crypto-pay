import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly svc: AuthService) {}

  @Get('nonce')
  async nonce(@Query('address') address: string) {
    return this.svc.issueNonce(address);
  }

  @Post('verify')
  async verify(
    @Body() body: { message: string; signature: string; domain?: string },
  ) {
    return this.svc.verifyAndSign(body);
  }
}

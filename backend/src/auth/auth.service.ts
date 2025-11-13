import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { SiweMessage } from 'siwe';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async issueNonce(address: string) {
    if (!address) throw new BadRequestException('address required');
    const nonce = randomBytes(16).toString('hex'); // e.g., 32 chars
    await this.prisma.session.create({
      data: { address: address.toLowerCase(), nonce },
    });
    return { nonce };
  }

  async verifyAndSign(payload: {
    message: string;
    signature: string;
    domain?: string;
  }) {
    const { message, signature } = payload;
    if (!message || !signature)
      throw new BadRequestException('message/signature required');

    const siwe = new SiweMessage(message);
    const { data, success } = await siwe.verify({
      signature,
      domain: payload.domain, // optional
      nonce: siwe.nonce,
    });

    if (!success) throw new BadRequestException('Invalid SIWE');

    const addr = data.address.toLowerCase();
    // check nonce exists & mark used (simple anti-replay)
    const sess = await this.prisma.session.findFirst({
      where: { address: addr, nonce: data.nonce, used: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!sess) throw new BadRequestException('nonce not found or already used');

    await this.prisma.session.update({
      where: { id: sess.id },
      data: { used: true, usedAt: new Date() },
    });

    // upsert user
    const user = await this.prisma.user.upsert({
      where: { address: addr },
      update: { lastLoginAt: new Date() },
      create: { address: addr, lastLoginAt: new Date() },
    });

    const token = await this.jwt.signAsync({
      sub: user.id,
      address: user.address,
    });
    return { token, user: { id: user.id, address: user.address } };
  }
}

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy as JwtStrategyBase,
  ExtractJwt,
  type StrategyOptions,
  type SecretOrKeyProvider,
} from 'passport-jwt';
import type { Request } from 'express';
import { KeyVaultService } from '../security/keyvault.service';

export interface JwtPayload {
  sub: number;
  address: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(JwtStrategyBase) {
  // 간단 캐시: 매 요청마다 Key Vault 호출하지 않도록
  private cachedSecret: string | null = null;

  constructor(private readonly kv: KeyVaultService) {
    const provider: SecretOrKeyProvider = (
      _req: Request,
      _rawJwt: string,
      done: (err: any, secret?: string | Buffer) => void,
    ): void => {
      // 캐시된 값 있으면 즉시 반환
      if (this.cachedSecret) {
        done(null, this.cachedSecret);
        return;
      }

      // 비동기 처리지만 Promise를 '반환'하지 말고 then/catch로 처리
      this.kv
        .getSecret('JWT_SECRET')
        .then((fromKv) => {
          const secret = fromKv ?? process.env.JWT_SECRET ?? 'dev-secret';
          this.cachedSecret = secret;
          done(null, secret);
        })
        .catch((err) => {
          const fallback = process.env.JWT_SECRET;
          if (fallback) {
            this.cachedSecret = fallback;
            done(null, fallback);
          } else {
            done(err);
          }
        });
    };

    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      passReqToCallback: false,
      secretOrKeyProvider: provider,
    };

    super(options);
  }
  validate(payload: JwtPayload) {
    // 가드 통과 후 request.user 에 주입될 값
    return { userId: payload.sub, address: payload.address };
  }
}

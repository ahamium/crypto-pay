import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { HealthController } from './health.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';
import { VerifierModule } from './tx-verifier/verifier.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET!,
      signOptions: { expiresIn: '7d' },
    }),
    AuthModule,
    PaymentsModule,
    VerifierModule,
    AdminModule,
  ],
  controllers: [AppController, HealthController],
  providers: [PrismaService, AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { AccessRequestsModule } from './access-requests/access-requests.module';
import { AccessCodesModule } from './access-codes/access-codes.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // SECURITY: Rate limiting — maks 10 request per 60 detik per IP
    ThrottlerModule.forRoot([{
      ttl: 60000,  // 60 detik (dalam ms)
      limit: 10,   // maks 10 request per window
    }]),
    PrismaModule,
    MailModule,
    AuthModule,
    AccessRequestsModule,
    AccessCodesModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // SECURITY: Aktifkan ThrottlerGuard secara global
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

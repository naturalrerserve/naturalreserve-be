import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (() => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) throw new Error('[SECURITY] JWT_SECRET environment variable is not set!');
        return secret;
      })(),
    });
  }

  async validate(payload: { sub: string; username: string; role: string }) {
    // If it's an admin, return payload directly (admin is a static user, not in DB)
    if (payload.role === 'ADMIN') {
      return { id: payload.sub, username: payload.username, role: payload.role };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    
    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan.');
    }

    return user;
  }
}

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { VerifyLoginDto } from './dto/verify-login.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  // Static admin user — only one admin role
  private readonly ADMIN_USERS: Record<string, string> = {
    admin: process.env.ADMIN_PASSWORD || 'Admin@NR2024!',
  };

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async adminLogin(dto: AdminLoginDto) {
    const { username, password } = dto;
    const cleanUsername = username.trim().toLowerCase();

    // Check if it's a registered user with ADMIN role
    const user = await this.prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    let isValid = false;

    if (user && user.role === 'ADMIN') {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      // Fallback to static admin if no database user found
      const expectedPassword = this.ADMIN_USERS[cleanUsername];
      if (expectedPassword && expectedPassword === password) {
        isValid = true;
      }
    }

    if (!isValid) {
      throw new UnauthorizedException('Username atau password admin salah.');
    }

    const payload = {
      sub: user ? user.id : 'admin-id',
      username: cleanUsername,
      role: 'ADMIN',
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user ? user.id : 'admin-id',
        username: cleanUsername,
        role: 'ADMIN',
        firstName: user ? user.firstName : 'Super',
        lastName: user ? user.lastName : 'Admin',
        avatar: user ? user.avatar : null,
      },
    };
  }

  async userLogin(dto: LoginDto) {
    const { username, password } = dto;
    const cleanUsername = username.trim().toLowerCase();

    // 1. Find the user profile
    let user = await this.prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (!user) {
      // 1b. Check if there's a pending access request
      const accessReq = await this.prisma.accessRequest.findFirst({
        where: { username: cleanUsername },
        orderBy: { createdAt: 'desc' },
      });

      if (accessReq) {
        const isPasswordValid = await bcrypt.compare(password, accessReq.password);
        if (!isPasswordValid) {
          throw new UnauthorizedException('Username atau password salah.');
        }

        if (accessReq.status === 'PENDING') {
          throw new UnauthorizedException('Akun Anda sedang menunggu persetujuan Admin.');
        } else if (accessReq.status === 'UNVERIFIED') {
          throw new UnauthorizedException('Email Anda belum diverifikasi. Silakan periksa email Anda.');
        } else if (accessReq.status === 'REJECTED') {
          throw new UnauthorizedException('Permintaan akses Anda telah ditolak oleh Admin.');
        }
      }

      throw new UnauthorizedException('Username atau password salah.');
    }

    // 2. Compare code (bcrypt)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Username atau password salah.');
    }

    // 3. Increment login count
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        loginCount: {
          increment: 1,
        },
      },
    });

    // 4. Generate JWT token
    const payload = {
      sub: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        phone: updatedUser.phone,
        location: updatedUser.location,
        bio: updatedUser.bio,
        joinDate: updatedUser.joinDate.toISOString(),
        loginCount: updatedUser.loginCount,
      },
    };
  }
}

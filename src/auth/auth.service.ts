import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { VerifyLoginDto } from './dto/verify-login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { MailService } from '../mail/mail.service';
import { OAuth2Client } from 'google-auth-library';
import { generateOtp, isExpired } from '../common/utils';

@Injectable()
export class AuthService {
  // Static admin user — only one admin role
  private readonly ADMIN_USERS: Record<string, string> = {
    admin: process.env.ADMIN_PASSWORD || 'Admin@NR2024!',
  };

  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

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
      throw new UnauthorizedException('Username atau password salah.');
    }

    // 2. Compare code (bcrypt)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Username atau password salah.');
    }

    // 3. Cek OTP permanen
    let otp = user.loginOtp;
    let message = 'Silakan masukkan Kode Akses Permanen Anda untuk login.';

    if (!otp) {
      // Jika belum ada, buat OTP permanen
      otp = generateOtp();
      
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          loginOtp: otp,
          loginOtpExpiresAt: null, // Berlaku selamanya
        },
      });

      // Kirim via email HANYA JIKA baru pertama kali dibuat
      await this.mailService.sendOtp(user.email, user.firstName, otp);
      message = 'Kode Akses Permanen telah dikirim ke email Anda. Kode ini dapat digunakan seterusnya untuk login.';
    }

    return {
      requiresOtp: true,
      message,
    };
  }

  async verifyLoginOtp(dto: VerifyLoginDto) {
    const { username, otp } = dto;
    const cleanUsername = username.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (!user) {
      throw new UnauthorizedException('Sesi login tidak valid.');
    }

    if (!user.loginOtp || user.loginOtp !== otp) {
      throw new BadRequestException('Kode verifikasi salah.');
    }

    // Hapus logika expired karena kode sekarang permanen
    // if (isExpired(user.loginOtpExpiresAt)) { ... }

    // 1. Increment login count (TIDAK menghapus loginOtp)
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        loginCount: {
          increment: 1,
        },
      },
    });

    // 2. Generate JWT token
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

  async googleLogin(dto: GoogleLoginDto) {
    const { credential } = dto;

    try {
      // 1. Verify the Google ID Token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Token Google tidak valid.');
      }

      // 2. Cek apakah email sudah terdaftar di database (Logika Opsi B)
      const user = await this.prisma.user.findFirst({
        where: { email: payload.email },
      });

      if (!user) {
        throw new UnauthorizedException('Akun Anda belum terdaftar. Silakan ajukan Permintaan Akses terlebih dahulu melalui halaman depan.');
      }

      // 3. Update login count dan avatar jika perlu
      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          loginCount: { increment: 1 },
          avatar: user.avatar || payload.picture, // Gunakan avatar Google jika belum punya
        },
      });

      // 4. Generate JWT
      const jwtPayload = {
        sub: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
      };

      return {
        access_token: this.jwtService.sign(jwtPayload),
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
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Gagal melakukan autentikasi dengan Google.');
    }
  }
}

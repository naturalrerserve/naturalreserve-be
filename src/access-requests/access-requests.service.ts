import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { generateOtp, generateAccessCode, isExpired } from '../common/utils';
import { CreateRequestDto } from './dto/create-request.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AccessRequestsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async createRequest(dto: CreateRequestDto) {
    const { name, email, username, password, reason } = dto;
    const cleanUsername = username.trim().toLowerCase();

    // 1. Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existingUser) {
      throw new ConflictException('Username sudah terdaftar.');
    }

    // 2. Check if username or email has a pending or approved request
    const existingRequest = await this.prisma.accessRequest.findFirst({
      where: {
        OR: [
          { username: cleanUsername },
          { email: email.trim() },
        ],
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });
    if (existingRequest) {
      throw new ConflictException('Permintaan akses untuk username atau email ini sudah ada.');
    }

    // 3. Generate OTP (6 digits) and set expiration (15 minutes)
    const otp = generateOtp();
    const otpExpiresAt = new Date();
    otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 15);

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Create or update access request
    const request = await this.prisma.accessRequest.upsert({
      where: { username: cleanUsername },
      update: {
        name,
        email: email.trim(),
        reason,
        password: hashedPassword,
        status: 'UNVERIFIED',
        verificationOtp: otp,
        otpExpiresAt,
      },
      create: {
        name,
        email: email.trim(),
        username: cleanUsername,
        reason,
        password: hashedPassword,
        status: 'UNVERIFIED',
        verificationOtp: otp,
        otpExpiresAt,
      },
    });

    // 6. Send OTP Email
    const emailSent = await this.mailService.sendOtp(request.email, request.name, otp);
    if (!emailSent) {
      throw new BadRequestException('Gagal mengirimkan kode verifikasi ke email Anda.');
    }

    return {
      message: 'Kode verifikasi telah dikirim ke email Anda.',
      username: cleanUsername,
      status: request.status,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const { username, otp } = dto;
    const cleanUsername = username.trim().toLowerCase();

    const request = await this.prisma.accessRequest.findUnique({
      where: { username: cleanUsername },
    });

    if (!request) {
      throw new NotFoundException('Permintaan akses tidak ditemukan.');
    }

    if (request.status !== 'UNVERIFIED') {
      throw new BadRequestException('Email sudah terverifikasi sebelumnya.');
    }

    if (request.verificationOtp !== otp) {
      throw new BadRequestException('Kode verifikasi salah.');
    }

    if (isExpired(request.otpExpiresAt)) {
      throw new BadRequestException('Kode verifikasi telah kedaluwarsa. Silakan ajukan ulang.');
    }

    // Update status to PENDING (verified and waiting for admin approval)
    const updated = await this.prisma.accessRequest.update({
      where: { id: request.id },
      data: {
        status: 'PENDING',
        verificationOtp: null,
        otpExpiresAt: null,
      },
    });

    return {
      message: 'Email berhasil diverifikasi. Permintaan Anda sedang menunggu persetujuan admin.',
      status: updated.status,
    };
  }

  async getAllRequests() {
    return this.prisma.accessRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveRequest(id: string, adminUsername: string) {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Permintaan akses tidak ditemukan.');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Permintaan tidak bisa disetujui karena berstatus ${request.status}.`);
    }

    // 1. Create User profile record with the stored password and a permanent access code
    const permanentCode = generateOtp();
    await this.prisma.user.upsert({
      where: { username: request.username },
      update: {
        email: request.email,
        firstName: request.name,
        role: 'OPERATOR',
        password: request.password || '',
        loginOtp: permanentCode,
        loginOtpExpiresAt: null,
      },
      create: {
        username: request.username,
        email: request.email,
        firstName: request.name,
        role: 'OPERATOR',
        password: request.password || '',
        loginOtp: permanentCode,
        loginOtpExpiresAt: null,
      },
    });

    // 2. Update request status to APPROVED
    await this.prisma.accessRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: adminUsername,
      },
    });

    // 3. Send approval email via Gmail SMTP
    const emailSent = await this.mailService.sendAccountApproved(request.email, request.name, request.username, permanentCode);

    return {
      message: 'Permintaan akses berhasil disetujui. Kode akses permanen telah dikirim ke email.',
      code: permanentCode,
      emailSent,
    };
  }

  async rejectRequest(id: string, adminUsername: string) {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Permintaan akses tidak ditemukan.');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Hanya permintaan berstatus pending yang dapat ditolak.');
    }

    await this.prisma.accessRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy: adminUsername,
      },
    });

    return {
      message: 'Permintaan akses ditolak.',
    };
  }
}

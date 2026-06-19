import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { generateAccessCode } from '../common/utils';
import { GenerateCodeDto } from './dto/generate-code.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AccessCodesService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async getAllCodes() {
    return this.prisma.accessCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeCode(id: string) {
    const codeRecord = await this.prisma.accessCode.findUnique({
      where: { id },
    });

    if (!codeRecord) {
      throw new NotFoundException('Kode akses tidak ditemukan.');
    }

    return this.prisma.accessCode.update({
      where: { id },
      data: { status: 'REVOKED' },
    });
  }

  async generateManualCode(dto: GenerateCodeDto) {
    const { username, email, name, code: customCode } = dto;
    const cleanUsername = username.trim().toLowerCase();

    // 1. Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existingUser) {
      throw new ConflictException('Username sudah terdaftar.');
    }

    // 2. Generate/Validate password
    const rawPassword = customCode ? customCode.trim() : 'password123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // 3. Create User profile record with password
    await this.prisma.user.upsert({
      where: { username: cleanUsername },
      update: {
        email: email.trim(),
        firstName: name,
        role: 'OPERATOR',
        password: hashedPassword,
      },
      create: {
        username: cleanUsername,
        email: email.trim(),
        firstName: name,
        role: 'OPERATOR',
        password: hashedPassword,
      },
    });

    // 4. Send email
    const emailSent = await this.mailService.sendAccountApproved(email.trim(), name, cleanUsername);

    return {
      message: 'Akun berhasil dibuat.',
      emailSent,
    };
  }
}

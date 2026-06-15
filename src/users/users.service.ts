import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LogActivityDto } from './dto/log-activity.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.getProfile(userId); // Ensure user exists
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
  }

  async updateAvatar(userId: string, dto: UpdateAvatarDto) {
    await this.getProfile(userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatar: dto.avatar },
    });
  }

  async changePassword(username: string, dto: ChangePasswordDto) {
    const { currentPassword, newPassword } = dto;

    const accessCode = await this.prisma.accessCode.findUnique({
      where: { username },
    });

    if (!accessCode) {
      throw new NotFoundException('Kode akses tidak ditemukan.');
    }

    const isMatch = await bcrypt.compare(currentPassword, accessCode.code);
    if (!isMatch) {
      throw new BadRequestException('Kode akses saat ini salah.');
    }

    const newHashedCode = await bcrypt.hash(newPassword, 10);

    await this.prisma.accessCode.update({
      where: { username },
      data: { code: newHashedCode },
    });

    return { message: 'Kode akses berhasil diperbarui.' };
  }

  async logActivity(userId: string, dto: LogActivityDto) {
    return this.prisma.activityLog.create({
      data: {
        userId,
        type: dto.type,
        description: dto.description,
      },
    });
  }

  async getActivityLogs(userId: string) {
    return this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
  }

  async clearActivityLogs(userId: string) {
    await this.prisma.activityLog.deleteMany({
      where: { userId },
    });
    return { message: 'Semua log aktivitas berhasil dihapus.' };
  }

  // Fish List
  async getFishList(userId: string) {
    const record = await this.prisma.fishList.findUnique({
      where: { userId },
    });
    return record ? record.fishData : [];
  }

  async updateFishList(userId: string, fishData: any[]) {
    // Make sure we have a valid array
    const dataArray = Array.isArray(fishData) ? fishData : [];
    return this.prisma.fishList.upsert({
      where: { userId },
      update: { fishData: dataArray },
      create: { userId, fishData: dataArray },
    });
  }

  // App Settings
  async getSettings(userId: string) {
    const record = await this.prisma.appSettings.findUnique({
      where: { userId },
    });
    return record ? record.settingsData : null;
  }

  async updateSettings(userId: string, settingsData: any) {
    const dataObj = settingsData || {};
    return this.prisma.appSettings.upsert({
      where: { userId },
      update: { settingsData: dataObj },
      create: { userId, settingsData: dataObj },
    });
  }

  // History entries
  async getHistory(userId: string) {
    const records = await this.prisma.historyEntry.findMany({
      where: { userId },
    });
    
    // Map array of entries to Record<string, HistoryEntry> like client-side Firestore load did
    const historyMap: Record<string, any> = {};
    records.forEach((rec: any) => {
      historyMap[rec.dateKey] = rec.data;
    });
    return historyMap;
  }

  async saveHistoryEntry(userId: string, dateKey: string, data: any) {
    return this.prisma.historyEntry.upsert({
      where: {
        userId_dateKey: {
          userId,
          dateKey,
        },
      },
      update: { data },
      create: {
        userId,
        dateKey,
        data,
      },
    });
  }

  async clearHistory(userId: string) {
    await this.prisma.historyEntry.deleteMany({
      where: { userId },
    });
    return { message: 'Semua riwayat pemberian pakan berhasil dihapus.' };
  }

  async createAdmin(dto: CreateAdminDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.username.trim().toLowerCase() },
          { email: dto.email.trim().toLowerCase() },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.username === dto.username.trim().toLowerCase()) {
        throw new BadRequestException('Username sudah digunakan.');
      }
      throw new BadRequestException('Email sudah digunakan.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const admin = await this.prisma.user.create({
      data: {
        username: dto.username.trim().toLowerCase(),
        email: dto.email.trim().toLowerCase(),
        firstName: dto.name.split(' ')[0] || dto.name,
        lastName: dto.name.split(' ').slice(1).join(' ') || '',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    return {
      message: 'Admin baru berhasil dibuat.',
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
    };
  }

  async listAdmins() {
    return this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        joinDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteAdmin(adminId: string, requestingUserId: string) {
    if (adminId === requestingUserId) {
      throw new BadRequestException('Anda tidak dapat menghapus akun admin Anda sendiri.');
    }
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== 'ADMIN') {
      throw new BadRequestException('Admin tidak ditemukan.');
    }
    await this.prisma.user.delete({ where: { id: adminId } });
    return { message: `Admin '${admin.username}' berhasil dihapus.` };
  }
}

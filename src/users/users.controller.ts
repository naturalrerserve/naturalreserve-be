import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LogActivityDto } from './dto/log-activity.dto';
import { CreateAdminDto } from './dto/create-admin.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@Request() req: any) {
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN') {
      return {
        username: req.user.username,
        role: req.user.role,
        firstName: req.user.username === 'superadmin' ? 'Super' : 'Admin',
        lastName: 'Administrator',
      };
    }
    return this.usersService.getProfile(req.user.id);
  }

  @Put('me')
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN') {
      return { message: 'Profil admin tidak dapat diubah.' };
    }
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Put('me/avatar')
  async updateAvatar(@Request() req: any, @Body() dto: UpdateAvatarDto) {
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN') {
      return { message: 'Avatar admin tidak dapat diubah.' };
    }
    return this.usersService.updateAvatar(req.user.id, dto);
  }

  @Put('me/password')
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN') {
      return { message: 'Password admin tidak dapat diubah.' };
    }
    return this.usersService.changePassword(req.user.username, dto);
  }

  @Post('me/activity')
  async logActivity(@Request() req: any, @Body() dto: LogActivityDto) {
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN') {
      return { message: 'Aktivitas admin tidak dicatat.' };
    }
    return this.usersService.logActivity(req.user.id, dto);
  }

  @Get('me/activity')
  async getActivityLogs(@Request() req: any) {
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN') {
      return [];
    }
    return this.usersService.getActivityLogs(req.user.id);
  }

  @Delete('me/activity')
  async clearActivityLogs(@Request() req: any) {
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN') {
      return { message: 'Log aktivitas admin dikosongkan.' };
    }
    return this.usersService.clearActivityLogs(req.user.id);
  }

  @Get('me/fish')
  async getFishList(@Request() req: any) {
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN') {
      return [];
    }
    return this.usersService.getFishList(req.user.id);
  }

  @Put('me/fish')
  async updateFishList(@Request() req: any, @Body() body: { fish: any[] }) {
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN') {
      return { message: 'Data ikan admin tidak disimpan.' };
    }
    return this.usersService.updateFishList(req.user.id, body.fish);
  }

  @Get('me/settings')
  async getSettings(@Request() req: any) {
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN') {
      return null;
    }
    return this.usersService.getSettings(req.user.id);
  }

  @Put('me/settings')
  async updateSettings(@Request() req: any, @Body() body: any) {
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN') {
      return { message: 'Pengaturan admin tidak disimpan.' };
    }
    return this.usersService.updateSettings(req.user.id, body);
  }

  @Get('me/history')
  async getHistory(@Request() req: any) {
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN') {
      return {};
    }
    return this.usersService.getHistory(req.user.id);
  }

  @Post('me/history/:dateKey')
  async saveHistoryEntry(
    @Request() req: any,
    @Param('dateKey') dateKey: string,
    @Body() body: any,
  ) {
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN') {
      return { message: 'Riwayat pakan admin tidak disimpan.' };
    }
    return this.usersService.saveHistoryEntry(req.user.id, dateKey, body);
  }

  @Delete('me/history')
  async clearHistory(@Request() req: any) {
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN') {
      return { message: 'Riwayat pakan admin dikosongkan.' };
    }
    return this.usersService.clearHistory(req.user.id);
  }

  /* ── ADMIN MANAGEMENT ── */

  @Post('admins')
  async createAdmin(@Request() req: any, @Body() dto: CreateAdminDto) {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Hanya admin yang dapat membuat akun admin baru.');
    }
    return this.usersService.createAdmin(dto);
  }

  @Get('admins')
  async listAdmins(@Request() req: any) {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Akses ditolak.');
    }
    return this.usersService.listAdmins();
  }

  @Delete('admins/:id')
  async deleteAdmin(@Request() req: any, @Param('id') id: string) {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Hanya admin yang dapat menghapus akun admin.');
    }
    return this.usersService.deleteAdmin(id, req.user.id);
  }
}

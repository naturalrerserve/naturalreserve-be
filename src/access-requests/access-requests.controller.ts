import { Controller, Post, Body, Get, Put, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AccessRequestsService } from './access-requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('access-requests')
export class AccessRequestsController {
  constructor(private readonly requestsService: AccessRequestsService) {}

  @Post()
  async create(@Body() createDto: CreateRequestDto) {
    return this.requestsService.createRequest(createDto);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() verifyDto: VerifyOtpDto) {
    return this.requestsService.verifyOtp(verifyDto);
  }

  // Admin routes
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Request() req: any) {
    this.checkAdminRole(req.user.role);
    return this.requestsService.getAllRequests();
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/approve')
  async approve(@Param('id') id: string, @Request() req: any) {
    this.checkAdminRole(req.user.role);
    return this.requestsService.approveRequest(id, req.user.username);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/reject')
  async reject(@Param('id') id: string, @Request() req: any) {
    this.checkAdminRole(req.user.role);
    return this.requestsService.rejectRequest(id, req.user.username);
  }

  private checkAdminRole(role: string) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Akses ditolak. Hanya untuk Administrator.');
    }
  }
}

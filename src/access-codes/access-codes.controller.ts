import { Controller, Get, Post, Put, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AccessCodesService } from './access-codes.service';
import { GenerateCodeDto } from './dto/generate-code.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('access-codes')
export class AccessCodesController {
  constructor(private readonly codesService: AccessCodesService) {}

  @Get()
  async findAll(@Request() req: any) {
    this.checkAdminRole(req.user.role);
    return this.codesService.getAllCodes();
  }

  @Put(':id/revoke')
  async revoke(@Param('id') id: string, @Request() req: any) {
    this.checkAdminRole(req.user.role);
    return this.codesService.revokeCode(id);
  }

  @Post('generate')
  async generate(@Body() dto: GenerateCodeDto, @Request() req: any) {
    this.checkAdminRole(req.user.role);
    return this.codesService.generateManualCode(dto);
  }

  private checkAdminRole(role: string) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Akses ditolak. Hanya untuk Administrator.');
    }
  }
}

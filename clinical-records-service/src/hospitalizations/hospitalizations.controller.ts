import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { HospitalizationsService } from './hospitalizations.service.js';
import {
  CreateHospitalizationDto,
  DischargePatientDto,
} from './dto/create-hospitalization.dto.js';
import { CurrentUser, Roles, type AuthenticatedUser } from '../auth/auth.decorators.js';

@ApiTags('Hospitalizations & Bed Census (Hospital Stay)')
@Roles('admin_user', 'doctor_user', 'nurse_user', 'receptionist_user')
@Controller('hospitalizations')
export class HospitalizationsController {
  constructor(private readonly hospitalizationsService: HospitalizationsService) {}

  @Get('bed-census')
  @ApiOperation({ summary: 'Query real-time bed and room census' })
  async getBedCensus() {
    return await this.hospitalizationsService.getBedCensus();
  }

  @Get()
  @ApiOperation({ summary: 'List hospitalizations with active/closed filter' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  async findAll(@Query('activeOnly') activeOnly?: string) {
    const onlyActive = activeOnly === 'true';
    return await this.hospitalizationsService.findAll(onlyActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get hospitalization details by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.hospitalizationsService.findOne(id);
  }

  @Roles('admin_user', 'doctor_user', 'nurse_user')
  @Post('admit')
  @ApiOperation({ summary: 'Admit a patient to a room' })
  async admit(
    @Body() dto: CreateHospitalizationDto,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: any,
  ) {
    return await this.hospitalizationsService.admit(dto, {
      user,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  @Roles('admin_user', 'doctor_user', 'nurse_user')
  @Patch(':id/discharge')
  @ApiOperation({ summary: 'Medically discharge an inpatient' })
  async discharge(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DischargePatientDto,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: any,
  ) {
    return await this.hospitalizationsService.discharge(id, dto, {
      user,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }
}

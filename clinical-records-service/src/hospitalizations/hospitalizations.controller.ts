import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { HospitalizationsService } from './hospitalizations.service.js';
import {
  CreateHospitalizationDto,
  DischargePatientDto,
} from './dto/create-hospitalization.dto.js';
import { Roles } from '../auth/auth.decorators.js';

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

  @Post('admit')
  @ApiOperation({ summary: 'Admit a patient to a room' })
  async admit(@Body() dto: CreateHospitalizationDto) {
    return await this.hospitalizationsService.admit(dto);
  }

  @Patch(':id/discharge')
  @ApiOperation({ summary: 'Medically discharge an inpatient' })
  async discharge(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DischargePatientDto,
  ) {
    return await this.hospitalizationsService.discharge(id, dto);
  }
}

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

@ApiTags('Internaciones y Censo de Camas (Hospital Stay)')
@Roles('admin_user', 'doctor_user', 'nurse_user', 'receptionist_user')
@Controller('hospitalizations')
export class HospitalizationsController {
  constructor(private readonly hospitalizationsService: HospitalizationsService) {}

  @Get('bed-census')
  @ApiOperation({ summary: 'Consultar el censo en tiempo real de camas y habitaciones' })
  async getBedCensus() {
    return await this.hospitalizationsService.getBedCensus();
  }

  @Get()
  @ApiOperation({ summary: 'Listar internaciones con filtro de activas/cerradas' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  async findAll(@Query('activeOnly') activeOnly?: string) {
    const onlyActive = activeOnly === 'true';
    return await this.hospitalizationsService.findAll(onlyActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de internación por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.hospitalizationsService.findOne(id);
  }

  @Post('admit')
  @ApiOperation({ summary: 'Admitir a un paciente en una habitación' })
  async admit(@Body() dto: CreateHospitalizationDto) {
    return await this.hospitalizationsService.admit(dto);
  }

  @Patch(':id/discharge')
  @ApiOperation({ summary: 'Dar de alta médica a un paciente internado' })
  async discharge(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DischargePatientDto,
  ) {
    return await this.hospitalizationsService.discharge(id, dto);
  }
}

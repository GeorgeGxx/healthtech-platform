import {
  Controller,
  Inject,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { PatientsService } from './patients.service.js';
import { CreatePatientDto } from './dto/create-patient.dto.js';
import { PhiAuditInterceptor } from '../audit/audit.interceptor.js';
import { Roles } from '../../auth/roles.decorator.js';

@ApiTags('Pacientes (Patient Care)')
@ApiBearerAuth('KeycloakAuth')
@Controller('patients')
@UseInterceptors(PhiAuditInterceptor)
@Roles('admin_user', 'doctor_user', 'nurse_user', 'receptionist_user')
export class PatientsController {
  constructor(@Inject(PatientsService) private readonly patientsService: PatientsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los pacientes o buscar por término' })
  @ApiQuery({ name: 'search', required: false, description: 'Búsqueda por DNI, nombre, apellido o email' })
  async findAll(@Query('search') search?: string) {
    return await this.patientsService.findAll(search);
  }

  @Get('insurances')
  @ApiOperation({ summary: 'Listar obras sociales y coberturas' })
  async getInsurances() {
    return await this.patientsService.getInsurances();
  }

  @Get('countries')
  @ApiOperation({ summary: 'Listar catálogo de países' })
  async getCountries() {
    return await this.patientsService.getCountries();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de paciente por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.patientsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo paciente' })
  async create(@Body() dto: CreatePatientDto) {
    return await this.patientsService.create(dto);
  }
}

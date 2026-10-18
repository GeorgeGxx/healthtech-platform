import {
  Controller,
  Inject,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { MedicalRecordsService } from './medical-records.service.js';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto.js';
import { PhiAuditInterceptor } from '../audit/audit.interceptor.js';
import { Roles } from '../../auth/roles.decorator.js';

@ApiTags('Historias Clínicas (Medical Records & EHR)')
@ApiBearerAuth('KeycloakAuth')
@Controller('medical-records')
@UseInterceptors(PhiAuditInterceptor)
@Roles('doctor_user', 'admin_user', 'nurse_user')
export class MedicalRecordsController {
  constructor(
    @Inject(MedicalRecordsService)
    private readonly recordsService: MedicalRecordsService,
  ) {}

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Obtener historial clínico de un paciente' })
  async findByPatient(@Param('patientId', ParseIntPipe) patientId: number) {
    return await this.recordsService.findByPatient(patientId);
  }

  @Get('doctor/:doctorId')
  @ApiOperation({ summary: 'Obtener notas de evolución de los pacientes asignados a un médico' })
  async findByDoctor(@Param('doctorId', ParseIntPipe) doctorId: number) {
    return await this.recordsService.findByDoctor(doctorId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Búsqueda clínica en texto completo (Full Text Search PostgreSQL en español)' })
  @ApiQuery({ name: 'q', required: true, description: 'Término clínico (ej: hipertensión, diabetes, fractura)' })
  async searchClinicalText(@Query('q') query: string) {
    return await this.recordsService.searchClinicalText(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de evolución clínica por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.recordsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar una nueva evolución clínica con signos vitales y recetas' })
  async create(@Body() dto: CreateMedicalRecordDto) {
    return await this.recordsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar y guardar cambios en una nota de evolución clínica' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateMedicalRecordDto>,
  ) {
    return await this.recordsService.update(id, dto);
  }
}

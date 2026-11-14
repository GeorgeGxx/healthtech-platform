import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MedicalRecordsService } from './medical-records.service.js';
import {
  CreateMedicalRecordDto,
  UpdateMedicalRecordDto,
  CreateDigitalPrescriptionDto,
} from './dto/create-medical-record.dto.js';
import { Public, Roles } from '../auth/auth.decorators.js';

@ApiTags('Historias Clínicas (Medical Records & EHR)')
@Roles('admin_user', 'doctor_user', 'nurse_user')
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly recordsService: MedicalRecordsService) {}

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

  @Post('prescriptions')
  @ApiOperation({ summary: 'Generar Receta Médica Digital con firma criptográfica HMAC-SHA256' })
  async createPrescription(@Body() dto: CreateDigitalPrescriptionDto) {
    return await this.recordsService.createPrescription(dto);
  }

  @Public()
  @Get('prescriptions/:code/verify')
  @ApiOperation({ summary: 'Verificación pública de autenticidad de Receta Médica Digital (Lector QR)' })
  async verifyPrescription(@Param('code') code: string) {
    return await this.recordsService.verifyPrescription(code);
  }

  @Get(':id/fhir')
  @ApiOperation({ summary: 'Obtener recurso HL7 FHIR R4 Encounter / DiagnosticReport' })
  async findOneFhir(@Param('id', ParseIntPipe) id: number) {
    return await this.recordsService.findOneFhir(id);
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
    @Body() dto: UpdateMedicalRecordDto,
  ) {
    return await this.recordsService.update(id, dto);
  }
}

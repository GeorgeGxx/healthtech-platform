import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MedicalRecordsService } from './medical-records.service.js';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto.js';

@ApiTags('Historias Clínicas (Medical Records & EHR)')
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly recordsService: MedicalRecordsService) {}

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Obtener historial clínico de un paciente' })
  async findByPatient(@Param('patientId', ParseIntPipe) patientId: number) {
    return await this.recordsService.findByPatient(patientId);
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
}

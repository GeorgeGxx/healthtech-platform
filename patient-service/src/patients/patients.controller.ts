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
import { PatientsService } from './patients.service.js';
import { CreatePatientDto, UpdatePatientDto } from './dto/create-patient.dto.js';

@ApiTags('Pacientes (Patient Care - Microservicio)')
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check del microservicio patient-service' })
  health() {
    return {
      status: 'UP',
      service: 'patient-service',
      port: 3002,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/liveness')
  @ApiOperation({ summary: 'Liveness probe (K8s / Orquestador)' })
  liveness() {
    return { status: 'UP', service: 'patient-service' };
  }

  @Get('health/readiness')
  @ApiOperation({ summary: 'Readiness probe (PostgreSQL y Kafka connectivity)' })
  async readiness() {
    const check = await this.patientsService.checkReadiness();
    return check;
  }

  @Get('fhir')
  @ApiOperation({ summary: 'Listado de pacientes en formato estándar HL7 FHIR R4 Bundle' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findFhirBundle(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return await this.patientsService.findAllFhir(search, pageNum, limitNum);
  }

  @Get(':id/fhir')
  @ApiOperation({ summary: 'Obtener recurso HL7 FHIR R4 Patient por ID' })
  async findOneFhir(@Param('id', ParseIntPipe) id: number) {
    return await this.patientsService.findOneFhir(id);
  }

  @Get('catalogs/insurances')
  @ApiOperation({ summary: 'Obtener catálogo de aseguradoras / obras sociales' })
  findInsurances() {
    return this.patientsService.findInsurances();
  }

  @Get('catalogs/countries')
  @ApiOperation({ summary: 'Obtener catálogo de países' })
  findCountries() {
    return this.patientsService.findCountries();
  }

  @Get()
  @ApiOperation({ summary: 'Listar pacientes con filtro opcional de búsqueda y paginación' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return await this.patientsService.findAll(search, pageNum, limitNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener datos demográficos del paciente por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.patientsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo paciente (Emite evento patient.registered)' })
  async create(@Body() dto: CreatePatientDto) {
    return await this.patientsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar expediente demográfico del paciente' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientDto,
  ) {
    return await this.patientsService.update(id, dto);
  }
}

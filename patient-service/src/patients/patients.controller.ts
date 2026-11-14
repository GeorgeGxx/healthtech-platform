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
import { Public, Roles, CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators.js';

@ApiTags('Patients (Patient Care - Microservice)')
@Roles('admin_user', 'doctor_user', 'nurse_user', 'receptionist_user')
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check for the patient-service microservice' })
  health() {
    return {
      status: 'UP',
      service: 'patient-service',
      port: 3002,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health/liveness')
  @ApiOperation({ summary: 'Liveness probe (K8s / Orchestrator)' })
  liveness() {
    return { status: 'UP', service: 'patient-service' };
  }

  @Public()
  @Get('health/readiness')
  @ApiOperation({ summary: 'Readiness probe (PostgreSQL and Kafka connectivity)' })
  async readiness() {
    const check = await this.patientsService.checkReadiness();
    return check;
  }

  @Roles('admin_user', 'doctor_user', 'nurse_user')
  @Get('fhir')
  @ApiOperation({ summary: 'List patients in HL7 FHIR R4 Bundle standard format' })
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

  @Roles('admin_user', 'doctor_user', 'nurse_user')
  @Get(':id/fhir')
  @ApiOperation({ summary: 'Get HL7 FHIR R4 Patient resource by ID' })
  async findOneFhir(@Param('id', ParseIntPipe) id: number) {
    return await this.patientsService.findOneFhir(id);
  }

  @Public()
  @Get('catalogs/insurances')
  @ApiOperation({ summary: 'Get catalog of insurance providers / health plans' })
  findInsurances() {
    return this.patientsService.findInsurances();
  }

  @Public()
  @Get('catalogs/countries')
  @ApiOperation({ summary: 'Get catalog of countries' })
  findCountries() {
    return this.patientsService.findCountries();
  }

  @Get()
  @ApiOperation({ summary: 'List patients with optional search filter and pagination' })
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

  @Roles('admin_user', 'doctor_user', 'nurse_user', 'receptionist_user', 'basic_user')
  @Get(':id')
  @ApiOperation({ summary: 'Get patient demographics by ID (self-scoped for basic_user)' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return await this.patientsService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Register a new patient (Emits patient.registered event)' })
  async create(@Body() dto: CreatePatientDto) {
    return await this.patientsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update patient demographic record' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientDto,
  ) {
    return await this.patientsService.update(id, dto);
  }
}

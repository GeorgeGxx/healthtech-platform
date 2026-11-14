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

@ApiTags('Medical Records & EHR')
@Roles('admin_user', 'doctor_user', 'nurse_user')
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly recordsService: MedicalRecordsService) {}

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get clinical history of a patient' })
  async findByPatient(@Param('patientId', ParseIntPipe) patientId: number) {
    return await this.recordsService.findByPatient(patientId);
  }

  @Get('doctor/:doctorId')
  @ApiOperation({ summary: 'Get progress notes for patients assigned to a physician' })
  async findByDoctor(@Param('doctorId', ParseIntPipe) doctorId: number) {
    return await this.recordsService.findByDoctor(doctorId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Full-text clinical search (PostgreSQL Full Text Search in Spanish)' })
  @ApiQuery({ name: 'q', required: true, description: 'Clinical term (e.g. hypertension, diabetes, fracture)' })
  async searchClinicalText(@Query('q') query: string) {
    return await this.recordsService.searchClinicalText(query);
  }

  @Post('prescriptions')
  @ApiOperation({ summary: 'Generate Digital Medical Prescription with HMAC-SHA256 cryptographic signature' })
  async createPrescription(@Body() dto: CreateDigitalPrescriptionDto) {
    return await this.recordsService.createPrescription(dto);
  }

  @Public()
  @Get('prescriptions/:code/verify')
  @ApiOperation({ summary: 'Public authenticity verification of Digital Medical Prescription (QR Reader)' })
  async verifyPrescription(@Param('code') code: string) {
    return await this.recordsService.verifyPrescription(code);
  }

  @Get(':id/fhir')
  @ApiOperation({ summary: 'Get HL7 FHIR R4 Encounter / DiagnosticReport resource' })
  async findOneFhir(@Param('id', ParseIntPipe) id: number) {
    return await this.recordsService.findOneFhir(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get clinical progress note details by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.recordsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Record a new clinical progress note with vital signs and prescriptions' })
  async create(@Body() dto: CreateMedicalRecordDto) {
    return await this.recordsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update and save changes to a clinical progress note' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMedicalRecordDto,
  ) {
    return await this.recordsService.update(id, dto);
  }
}

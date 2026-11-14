import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MedicalRecordsService } from './medical-records.service.js';
import {
  CreateMedicalRecordDto,
  UpdateMedicalRecordDto,
  CreateDigitalPrescriptionDto,
} from './dto/create-medical-record.dto.js';
import { CurrentUser, Public, Roles, type AuthenticatedUser } from '../auth/auth.decorators.js';

@ApiTags('Medical Records & EHR')
@Roles('admin_user', 'doctor_user', 'nurse_user')
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly recordsService: MedicalRecordsService) {}

  @Roles('admin_user', 'doctor_user', 'nurse_user', 'basic_user')
  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get clinical history of a patient (self-scoped for basic_user)' })
  async findByPatient(
    @Param('patientId', ParseIntPipe) patientId: number,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: any,
  ) {
    return await this.recordsService.findByPatient(patientId, {
      user,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  @Roles('admin_user', 'doctor_user')
  @Get('doctor/:doctorId')
  @ApiOperation({ summary: 'Get progress notes for patients assigned to a physician' })
  async findByDoctor(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: any,
  ) {
    return await this.recordsService.findByDoctor(doctorId, {
      user,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Clinical text and ICD-10 search across decrypted progress notes' })
  @ApiQuery({ name: 'q', required: true, description: 'Clinical term (e.g. hypertension, diabetes, fracture)' })
  async searchClinicalText(
    @Query('q') query: string,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: any,
  ) {
    return await this.recordsService.searchClinicalText(query, {
      user,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  @Roles('admin_user', 'doctor_user')
  @Post('prescriptions')
  @ApiOperation({ summary: 'Generate Digital Medical Prescription with HMAC-SHA256 cryptographic signature' })
  async createPrescription(
    @Body() dto: CreateDigitalPrescriptionDto,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: any,
  ) {
    return await this.recordsService.createPrescription(dto, {
      user,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  @Public()
  @Get('prescriptions/:code/verify')
  @ApiOperation({ summary: 'Public non-PHI authenticity verification of Digital Medical Prescription' })
  async verifyPrescription(@Param('code') code: string, @Req() req?: any) {
    return await this.recordsService.verifyPrescription(code, {
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  @Get(':id/fhir')
  @ApiOperation({ summary: 'Get HL7 FHIR R4 Encounter / DiagnosticReport resource' })
  async findOneFhir(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: any,
  ) {
    return await this.recordsService.findOneFhir(id, {
      user,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get clinical progress note details by ID' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: any,
  ) {
    return await this.recordsService.findOne(id, {
      user,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  @Post()
  @ApiOperation({ summary: 'Record a new clinical progress note with vital signs and prescriptions' })
  async create(
    @Body() dto: CreateMedicalRecordDto,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: any,
  ) {
    return await this.recordsService.create(dto, {
      user,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  @Roles('admin_user', 'doctor_user')
  @Put(':id')
  @ApiOperation({ summary: 'Append a versioned clinical addendum to an existing progress note' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMedicalRecordDto,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: any,
  ) {
    return await this.recordsService.update(id, dto, {
      user,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }
}

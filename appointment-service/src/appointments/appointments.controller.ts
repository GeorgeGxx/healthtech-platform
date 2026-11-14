import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service.js';
import { CreateAppointmentDto, UpdateAppointmentStatusDto } from './dto/create-appointment.dto.js';
import { Public, Roles } from '../auth/auth.decorators.js';

@ApiTags('Appointments and Medical Scheduling (Appointment Service)')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check for appointment-service microservice' })
  health() {
    return {
      status: 'UP',
      service: 'appointment-service',
      port: 3001,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health/liveness')
  @ApiOperation({ summary: 'Liveness probe (K8s)' })
  liveness() {
    return { status: 'UP', service: 'appointment-service' };
  }

  @Public()
  @Get('health/readiness')
  @ApiOperation({ summary: 'Readiness probe (Postgres + Kafka connectivity)' })
  async readiness() {
    return await this.appointmentsService.checkReadiness();
  }

  @Public()
  @Get('virtual-room/:roomId')
  @ApiOperation({ summary: 'Get status and ICE servers for a telemedicine virtual room' })
  async getVirtualRoom(
    @Param('roomId') roomId: string,
    @Query('token') token?: string,
  ) {
    return await this.appointmentsService.getVirtualRoom(roomId, token);
  }

  @Post(':id/virtual-room')
  @ApiOperation({ summary: 'Create or access the telemedicine virtual room for a medical appointment' })
  async createOrGetVirtualRoom(@Param('id', ParseIntPipe) id: number) {
    return await this.appointmentsService.createOrGetVirtualRoom(id);
  }

  @Get()
  @ApiOperation({ summary: 'List medical appointments optionally filtered by doctor or date' })
  @ApiQuery({ name: 'doctorId', required: false, type: Number })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('doctorId') doctorId?: string,
    @Query('date') date?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const docId = doctorId ? parseInt(doctorId, 10) : undefined;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return await this.appointmentsService.findAll(docId, date, pageNum, limitNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get medical appointment details by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.appointmentsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Schedule medical appointment (Choreographed Saga with Kafka event emission)' })
  async create(@Body() dto: CreateAppointmentDto) {
    return await this.appointmentsService.create(dto);
  }

  @Post('saga-booking')
  @ApiOperation({ summary: 'Schedule medical appointment via Orchestrated Saga with Compensation' })
  async createWithSaga(
    @Body() dto: CreateAppointmentDto,
    @Query('simularFallo') simularFallo?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    return await this.appointmentsService.executeBookingSaga(dto, {
      simularFallo: simularFallo === 'true',
      authHeader,
    });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update medical appointment status (confirmado, atendido, cancelado)' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return await this.appointmentsService.updateStatus(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel or void a medical appointment' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.appointmentsService.remove(id);
  }
}

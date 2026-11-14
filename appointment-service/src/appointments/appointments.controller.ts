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

@ApiTags('Turnos y Citas Médicas (Appointment Service)')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check del microservicio appointment-service' })
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
  @ApiOperation({ summary: 'Consultar estado e ICE servers de una sala virtual de telemedicina' })
  async getVirtualRoom(
    @Param('roomId') roomId: string,
    @Query('token') token?: string,
  ) {
    return await this.appointmentsService.getVirtualRoom(roomId, token);
  }

  @Post(':id/virtual-room')
  @ApiOperation({ summary: 'Crear o acceder a la sala virtual de telemedicina de una cita médica' })
  async createOrGetVirtualRoom(@Param('id', ParseIntPipe) id: number) {
    return await this.appointmentsService.createOrGetVirtualRoom(id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar turnos médicos filtrados opcionalmente por médico o fecha' })
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
  @ApiOperation({ summary: 'Obtener detalle de un turno médico por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.appointmentsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Agendar cita médica (Saga Coreográfica con emisión Kafka)' })
  async create(@Body() dto: CreateAppointmentDto) {
    return await this.appointmentsService.create(dto);
  }

  @Post('saga-booking')
  @ApiOperation({ summary: 'Agendar cita médica mediante Saga Orquestada con Compensación' })
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
  @ApiOperation({ summary: 'Actualizar estado del turno médico (confirmado, atendido, cancelado)' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return await this.appointmentsService.updateStatus(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancelar o anular un turno médico' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.appointmentsService.remove(id);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service.js';
import {
  CreateAppointmentDto,
  UpdateAppointmentStatusDto,
} from './dto/create-appointment.dto.js';

@ApiTags('Turnos y Agenda (Clinical Scheduling)')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar turnos médicos filtrados opcionalmente por médico y fecha' })
  @ApiQuery({ name: 'doctorId', required: false, type: Number })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'YYYY-MM-DD' })
  async findAll(
    @Query('doctorId') doctorId?: string,
    @Query('date') date?: string,
  ) {
    const docId = doctorId ? parseInt(doctorId, 10) : undefined;
    return await this.appointmentsService.findAll(docId, date);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un turno por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.appointmentsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Agendar un nuevo turno con validación anti-solapamiento' })
  async create(@Body() dto: CreateAppointmentDto) {
    return await this.appointmentsService.create(dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar el estado del turno (atendido, cancelado, etc.)' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return await this.appointmentsService.updateStatus(id, dto);
  }
}

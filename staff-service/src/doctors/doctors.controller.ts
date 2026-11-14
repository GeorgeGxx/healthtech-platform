import { Controller, Inject, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service.js';
import { Public } from '../auth/auth.decorators.js';

@ApiTags('Médicos y Especialidades (Clinical Staff)')
@Public()
@Controller('doctors')
export class DoctorsController {
  constructor(
    @Inject(DoctorsService)
    private readonly doctorsService: DoctorsService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check del microservicio de cuerpo médico' })
  getHealth() {
    return this.doctorsService.getHealth();
  }

  @Get('health/liveness')
  @ApiOperation({ summary: 'Liveness probe (K8s / Orquestador)' })
  liveness() {
    return { status: 'UP', service: 'staff-service' };
  }

  @Get('health/readiness')
  @ApiOperation({ summary: 'Readiness probe (PostgreSQL y Redis)' })
  async readiness() {
    return await this.doctorsService.checkReadiness();
  }

  @Get()
  @ApiOperation({ summary: 'Listar médicos en actividad con sus especialidades' })
  async findAll() {
    return await this.doctorsService.findAll();
  }

  @Get('specialties')
  @ApiOperation({ summary: 'Listar catálogo de especialidades médicas' })
  async getSpecialties() {
    return await this.doctorsService.getSpecialties();
  }

  @Get('offices')
  @ApiOperation({ summary: 'Listar consultorios físicos' })
  async getOffices() {
    return await this.doctorsService.getOffices();
  }

  @Get('hierarchy-tree')
  @ApiOperation({ summary: 'Consultar organigrama médico jerárquico (WITH RECURSIVE)' })
  async getHierarchyTree() {
    return await this.doctorsService.getHierarchyTree();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un médico por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.doctorsService.findOne(id);
  }
}

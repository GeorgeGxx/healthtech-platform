import { Controller, Inject, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service.js';
import { Public } from '../auth/auth.decorators.js';

@ApiTags('Physicians & Specialties (Clinical Staff)')
@Public()
@Controller('doctors')
export class DoctorsController {
  constructor(
    @Inject(DoctorsService)
    private readonly doctorsService: DoctorsService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check for the medical staff microservice' })
  getHealth() {
    return this.doctorsService.getHealth();
  }

  @Get('health/liveness')
  @ApiOperation({ summary: 'Liveness probe (K8s / Orchestrator)' })
  liveness() {
    return { status: 'UP', service: 'staff-service' };
  }

  @Get('health/readiness')
  @ApiOperation({ summary: 'Readiness probe (PostgreSQL and Redis)' })
  async readiness() {
    return await this.doctorsService.checkReadiness();
  }

  @Get()
  @ApiOperation({ summary: 'List active physicians with their specialties' })
  async findAll() {
    return await this.doctorsService.findAll();
  }

  @Get('specialties')
  @ApiOperation({ summary: 'List catalog of medical specialties' })
  async getSpecialties() {
    return await this.doctorsService.getSpecialties();
  }

  @Get('offices')
  @ApiOperation({ summary: 'List physical consultation offices' })
  async getOffices() {
    return await this.doctorsService.getOffices();
  }

  @Get('hierarchy-tree')
  @ApiOperation({ summary: 'Query hierarchical medical org chart (WITH RECURSIVE)' })
  async getHierarchyTree() {
    return await this.doctorsService.getHierarchyTree();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get physician details by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.doctorsService.findOne(id);
  }
}

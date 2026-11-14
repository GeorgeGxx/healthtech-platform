import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Medicamento } from '../entities/medicamento.entity.js';
import { PharmacyKafkaProducerService } from '../kafka/kafka-producer.service.js';

@Injectable()
export class PharmacyService {
  private readonly logger = new Logger(PharmacyService.name);

  constructor(
    @InjectRepository(Medicamento)
    private readonly medicamentoRepo: Repository<Medicamento>,
    private readonly kafka: PharmacyKafkaProducerService,
  ) {}

  async findAll(search?: string, categoria?: string, nivelAlerta?: string): Promise<Medicamento[]> {
    const query = this.medicamentoRepo
      .createQueryBuilder('m')
      .where('m.activo = :activo', { activo: true });

    if (search && search.trim() !== '') {
      const term = `%${search.trim().toLowerCase()}%`;
      query.andWhere(
        '(LOWER(m.nombre_comercial) LIKE :term OR LOWER(m.principio_activo) LIKE :term OR LOWER(m.lote) LIKE :term OR LOWER(m.ubicacion_almacen) LIKE :term)',
        { term },
      );
    }

    if (categoria && categoria.trim() !== '') {
      query.andWhere('m.categoria_terapeutica = :categoria', { categoria });
    }

    if (nivelAlerta && nivelAlerta.trim() !== '') {
      query.andWhere('m.nivel_alerta = :nivelAlerta', { nivelAlerta });
    }

    query.orderBy('m.id_medicamento', 'ASC');
    return await query.getMany();
  }

  async getSummary(): Promise<{
    totalMedicamentos: number;
    totalUnidadesStock: number;
    criticosCount: number;
    bajoCount: number;
    normalCount: number;
    valorInventarioMxn: number;
    almacenesCount: number;
  }> {
    const raw = await this.medicamentoRepo.query(`
      SELECT 
        COUNT(*)::int AS total_medicamentos,
        COALESCE(SUM(stock_actual), 0)::int AS total_unidades_stock,
        COUNT(*) FILTER (WHERE nivel_alerta = 'Crítico')::int AS criticos_count,
        COUNT(*) FILTER (WHERE nivel_alerta = 'Bajo')::int AS bajo_count,
        COUNT(*) FILTER (WHERE nivel_alerta = 'Normal')::int AS normal_count,
        COALESCE(SUM(stock_actual * precio_unitario_mxn), 0)::numeric(12,2) AS valor_inventario_mxn,
        COUNT(DISTINCT ubicacion_almacen)::int AS almacenes_count
      FROM medicamento
      WHERE activo = TRUE;
    `);

    const s = raw?.[0] || {};
    return {
      totalMedicamentos: Number(s.total_medicamentos || 0),
      totalUnidadesStock: Number(s.total_unidades_stock || 0),
      criticosCount: Number(s.criticos_count || 0),
      bajoCount: Number(s.bajo_count || 0),
      normalCount: Number(s.normal_count || 0),
      valorInventarioMxn: parseFloat(s.valor_inventario_mxn || '0'),
      almacenesCount: Number(s.almacenes_count || 0),
    };
  }

  async findOne(id: string): Promise<Medicamento> {
    const med = await this.medicamentoRepo.findOne({
      where: { idMedicamento: id, activo: true },
    });

    if (!med) {
      throw new NotFoundException(`Medication with ID ${id} not found.`);
    }

    return med;
  }

  async dispense(id: string, cantidad: number): Promise<Medicamento> {
    const med = await this.findOne(id);
    if (cantidad <= 0) {
      throw new BadRequestException('Quantity to dispense must be greater than 0');
    }
    if (med.stockActual < cantidad) {
      throw new BadRequestException(
        `Insufficient stock for ${med.nombreComercial}. Available: ${med.stockActual}, Requested: ${cantidad}`,
      );
    }

    med.stockActual -= cantidad;
    if (med.stockActual <= Math.floor(med.stockMinimo * 0.5)) {
      med.nivelAlerta = 'Crítico';
    } else if (med.stockActual <= med.stockMinimo) {
      med.nivelAlerta = 'Bajo';
    } else {
      med.nivelAlerta = 'Normal';
    }

    const saved = await this.medicamentoRepo.save(med);

    // Emit choreographed dispensation event
    await this.kafka.emit('pharmacy.medication_dispensed', saved.idMedicamento, {
      idMedicamento: saved.idMedicamento,
      nombreComercial: saved.nombreComercial,
      principioActivo: saved.principioActivo,
      cantidadDispensada: cantidad,
      stockRestante: saved.stockActual,
      ubicacionAlmacen: saved.ubicacionAlmacen,
      lote: saved.lote,
    });

    // If stock is at Low or Critical level, emit immediate alert to Kafka
    if (saved.stockActual <= saved.stockMinimo) {
      this.logger.warn(
        `🚨 Critical stock reached for medication ${saved.nombreComercial} (${saved.stockActual}/${saved.stockMinimo})`,
      );
      await this.kafka.emit('pharmacy.stock_low', saved.idMedicamento, {
        idMedicamento: saved.idMedicamento,
        nombreComercial: saved.nombreComercial,
        principioActivo: saved.principioActivo,
        stockActual: saved.stockActual,
        stockMinimo: saved.stockMinimo,
        nivelAlerta: saved.nivelAlerta,
        ubicacionAlmacen: saved.ubicacionAlmacen,
        lote: saved.lote,
      });
    }

    return saved;
  }

  async adjustStock(id: string, nuevoStock: number): Promise<Medicamento> {
    const med = await this.findOne(id);
    if (nuevoStock < 0) {
      throw new BadRequestException('Stock cannot be negative');
    }
    med.stockActual = nuevoStock;
    if (med.stockActual <= Math.floor(med.stockMinimo * 0.5)) {
      med.nivelAlerta = 'Crítico';
    } else if (med.stockActual <= med.stockMinimo) {
      med.nivelAlerta = 'Bajo';
    } else {
      med.nivelAlerta = 'Normal';
    }

    const saved = await this.medicamentoRepo.save(med);
    if (saved.stockActual <= saved.stockMinimo) {
      await this.kafka.emit('pharmacy.stock_low', saved.idMedicamento, {
        idMedicamento: saved.idMedicamento,
        nombreComercial: saved.nombreComercial,
        principioActivo: saved.principioActivo,
        stockActual: saved.stockActual,
        stockMinimo: saved.stockMinimo,
        nivelAlerta: saved.nivelAlerta,
        ubicacionAlmacen: saved.ubicacionAlmacen,
        lote: saved.lote,
      });
    }
    return saved;
  }

  getHealth() {
    return {
      status: 'UP',
      microservicio: 'pharmacy-service',
      puerto: 3004,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      baseDeDatos: 'PostgreSQL 18 (centromedico.medicamento)',
      eventos: 'Kafka 8.3.2 (healthtech.pharmacy.events.v1)',
    };
  }
}

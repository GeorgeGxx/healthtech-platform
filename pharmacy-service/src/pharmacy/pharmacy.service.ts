import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
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

  async dispense(
    id: string,
    cantidad: number,
    actorId?: string,
    idempotencyKey?: string,
    motivo?: string,
  ): Promise<Medicamento> {
    if (cantidad <= 0) {
      throw new BadRequestException('Quantity to dispense must be greater than 0');
    }

    const { saved, deduplicated } = await this.medicamentoRepo.manager.transaction(async (manager) => {
      if (idempotencyKey) {
        const existingMove = await manager.query(
          `SELECT id_movimiento FROM pharmacy.movimiento_inventario WHERE idempotency_key = $1 LIMIT 1`,
          [idempotencyKey],
        );
        if (existingMove.length > 0) {
          const current = await manager.getRepository(Medicamento).findOne({
            where: { idMedicamento: id },
          });
          if (!current) {
            throw new NotFoundException(`Medication with ID ${id} not found`);
          }
          return { saved: current, deduplicated: true };
        }
      }

      const updatedRows = await manager.query(
        `
        UPDATE medicamento
        SET
          stock_actual = stock_actual - $2,
          nivel_alerta = CASE
            WHEN stock_actual - $2 <= FLOOR(stock_minimo * 0.5) THEN 'Crítico'
            WHEN stock_actual - $2 <= stock_minimo THEN 'Bajo'
            ELSE 'Normal'
          END
        WHERE id_medicamento = $1 AND stock_actual >= $2
        RETURNING
          id_medicamento AS "idMedicamento",
          codigo_nacional AS "codigoNacional",
          nombre_comercial AS "nombreComercial",
          principio_activo AS "principioActivo",
          categoria,
          presentacion,
          lote,
          fecha_vencimiento AS "fechaVencimiento",
          stock_actual AS "stockActual",
          stock_minimo AS "stockMinimo",
          precio_unitario AS "precioUnitario",
          ubicacion_almacen AS "ubicacionAlmacen",
          nivel_alerta AS "nivelAlerta",
          activo;
        `,
        [id, cantidad],
      );

      if (updatedRows.length === 0) {
        const existing = await manager.getRepository(Medicamento).findOne({
          where: { idMedicamento: id },
        });
        if (!existing) {
          throw new NotFoundException(`Medication with ID ${id} not found`);
        }
        throw new ConflictException(
          `Insufficient stock for ${existing.nombreComercial}. Available: ${existing.stockActual}, Requested: ${cantidad}`,
        );
      }

      const updated = updatedRows[0] as Medicamento;

      await manager.query(
        `
        INSERT INTO pharmacy.movimiento_inventario (
          id_medicamento, tipo_movimiento, cantidad, stock_anterior, stock_nuevo,
          lote, fecha_vencimiento, actor_id, motivo, idempotency_key
        ) VALUES ($1, 'DISPENSACION', $2, $3, $4, $5, $6, $7, $8, $9);
        `,
        [
          updated.idMedicamento,
          -cantidad,
          updated.stockActual + cantidad,
          updated.stockActual,
          updated.lote ?? null,
          updated.caducidad ?? null,
          actorId || 'system',
          motivo || 'Medication dispensation',
          idempotencyKey ?? null,
        ],
      );

      const dispensedPayload = {
        idMedicamento: updated.idMedicamento,
        nombreComercial: updated.nombreComercial,
        principioActivo: updated.principioActivo,
        cantidadDispensada: cantidad,
        stockRestante: updated.stockActual,
        ubicacionAlmacen: updated.ubicacionAlmacen,
        lote: updated.lote,
      };

      await manager.query(
        `
        INSERT INTO outbox_evento (agregado_tipo, agregado_id, tipo_evento, topico, payload, metadata, estado, intentos)
        VALUES ('Medicamento', $1, 'pharmacy.medication_dispensed', 'pharmacy.medication_dispensed', $2::jsonb, '{"producerService":"pharmacy-service"}'::jsonb, 'PENDIENTE', 0);
        `,
        [updated.idMedicamento, JSON.stringify(dispensedPayload)],
      );

      return { saved: updated, deduplicated: false };
    });

    if (deduplicated) {
      return saved;
    }

    await this.kafka.emit('pharmacy.medication_dispensed', saved.idMedicamento, {
      idMedicamento: saved.idMedicamento,
      nombreComercial: saved.nombreComercial,
      principioActivo: saved.principioActivo,
      cantidadDispensada: cantidad,
      stockRestante: saved.stockActual,
      ubicacionAlmacen: saved.ubicacionAlmacen,
      lote: saved.lote,
    });

    if (saved.stockActual <= saved.stockMinimo) {
      this.logger.warn(
        `Critical stock reached for medication ${saved.nombreComercial} (${saved.stockActual}/${saved.stockMinimo})`,
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

  async adjustStock(
    id: string,
    nuevoStock: number,
    actorId?: string,
    motivo?: string,
  ): Promise<Medicamento> {
    if (nuevoStock < 0) {
      throw new BadRequestException('Stock cannot be negative');
    }

    const saved = await this.medicamentoRepo.manager.transaction(async (manager) => {
      const med = await manager.getRepository(Medicamento).findOne({
        where: { idMedicamento: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!med) {
        throw new NotFoundException(`Medication with ID ${id} not found`);
      }

      const previousStock = med.stockActual;
      med.stockActual = nuevoStock;
      if (med.stockActual <= Math.floor(med.stockMinimo * 0.5)) {
        med.nivelAlerta = 'Crítico';
      } else if (med.stockActual <= med.stockMinimo) {
        med.nivelAlerta = 'Bajo';
      } else {
        med.nivelAlerta = 'Normal';
      }

      const updated = await manager.getRepository(Medicamento).save(med);

      await manager.query(
        `
        INSERT INTO pharmacy.movimiento_inventario (
          id_medicamento, tipo_movimiento, cantidad, stock_anterior, stock_nuevo,
          lote, fecha_vencimiento, actor_id, motivo
        ) VALUES ($1, 'AJUSTE', $2, $3, $4, $5, $6, $7, $8);
        `,
        [
          updated.idMedicamento,
          nuevoStock - previousStock,
          previousStock,
          nuevoStock,
          updated.lote ?? null,
          updated.caducidad ?? null,
          actorId || 'system',
          motivo || 'Warehouse stock adjustment',
        ],
      );

      return updated;
    });

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

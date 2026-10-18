import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Medicamento } from '../../entities/medicamento.entity.js';

@Injectable()
export class PharmacyService {
  constructor(
    @InjectRepository(Medicamento)
    private readonly medicamentoRepo: Repository<Medicamento>,
  ) {}

  async findAll(search?: string, categoria?: string, nivelAlerta?: string): Promise<Medicamento[]> {
    const query = this.medicamentoRepo.createQueryBuilder('m')
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
      throw new NotFoundException(`Medicamento con identificador ${id} no encontrado.`);
    }

    return med;
  }
}

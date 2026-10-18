import { SelectQueryBuilder } from 'typeorm';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Aplica paginación estándar skip/take a un QueryBuilder de TypeORM
 */
export function applyPagination<T extends object>(
  qb: SelectQueryBuilder<T>,
  page?: number,
  limit?: number,
): SelectQueryBuilder<T> {
  if (page && limit && page > 0 && limit > 0) {
    qb.skip((page - 1) * limit).take(limit);
  }
  return qb;
}

/**
 * Formatea un resultado paginado consistente o devuelve el array plano si no se especificó paginación
 */
export function paginate<T>(
  data: T[],
  total: number,
  page?: number,
  limit?: number,
): PaginatedResult<T> | T[] {
  if (page && limit && page > 0 && limit > 0) {
    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  }
  return data;
}

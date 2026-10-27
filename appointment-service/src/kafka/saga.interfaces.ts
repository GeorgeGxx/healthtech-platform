export interface SagaStepDefinition<T = any> {
  nombrePaso: string;
  orden: number;
  ejecutar: (ctx: T) => Promise<{ resultado: any; contextoActualizado?: Partial<T> }>;
  compensar: (ctx: T, error?: any) => Promise<void>;
}

export type SagaStep = SagaStepDefinition;

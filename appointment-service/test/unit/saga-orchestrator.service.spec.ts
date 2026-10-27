import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SagaOrchestratorService } from '../../src/kafka/saga-orchestrator.service.js';
import { SagaStepDefinition } from '../../src/kafka/saga.interfaces.js';

describe('SagaOrchestratorService (Saga Orquestada con Compensación)', () => {
  let sagaOrchestrator: SagaOrchestratorService;
  let mockSagaRepo: any;
  let mockKafkaProducer: any;

  beforeEach(() => {
    mockSagaRepo = {
      create: vi.fn().mockImplementation((dto) => ({
        ...dto,
        idSaga: 'test-saga-uuid-1234',
      })),
      save: vi.fn().mockImplementation(async (entity) => ({
        ...entity,
        idSaga: entity.idSaga || 'test-saga-uuid-1234',
      })),
      findOne: vi.fn(),
    };

    mockKafkaProducer = {
      emit: vi.fn().mockResolvedValue({ eventId: 'event-uuid' }),
    };

    sagaOrchestrator = new SagaOrchestratorService(mockSagaRepo, mockKafkaProducer);
  });

  it('debe ejecutar exitosamente todos los pasos de una saga secuencial', async () => {
    const step1Compensar = vi.fn();
    const step2Compensar = vi.fn();

    const pasos: SagaStepDefinition<any>[] = [
      {
        nombrePaso: 'RESERVAR_SLOT_AGENDA',
        orden: 1,
        ejecutar: vi.fn().mockResolvedValue({
          resultado: { idTurno: 101 },
          contextoActualizado: { idTurno: 101 },
        }),
        compensar: step1Compensar,
      },
      {
        nombrePaso: 'VERIFICAR_COBERTURA_MEDICA',
        orden: 2,
        ejecutar: vi.fn().mockResolvedValue({
          resultado: { coberturaValida: true },
          contextoActualizado: { copago: 150 },
        }),
        compensar: step2Compensar,
      },
    ];

    const result = await sagaOrchestrator.executeSaga(
      'TestSuccessSaga',
      { pacienteId: 10 },
      pasos,
    );

    expect(result.estado).toBe('COMPLETADA');
    expect(result.pasosCompletados).toBe(2);
    expect(result.contextoFinal.idTurno).toBe(101);
    expect(result.contextoFinal.copago).toBe(150);
    expect(step1Compensar).not.toHaveBeenCalled();
    expect(step2Compensar).not.toHaveBeenCalled();
    expect(mockKafkaProducer.emit).toHaveBeenCalledTimes(4); // initiated, step 1, step 2, completed
  });

  it('debe ejecutar la compensación reversa (LIFO) cuando un paso falla', async () => {
    const step1Compensar = vi.fn().mockResolvedValue(undefined);
    const step2Ejecutar = vi.fn().mockRejectedValue(new Error('Fondos insuficientes en coaseguro'));
    const step2Compensar = vi.fn();

    const pasos: SagaStepDefinition<any>[] = [
      {
        nombrePaso: 'PASO_1_CREAR_RESERVA',
        orden: 1,
        ejecutar: vi.fn().mockResolvedValue({
          resultado: { idTurno: 202 },
          contextoActualizado: { idTurno: 202 },
        }),
        compensar: step1Compensar,
      },
      {
        nombrePaso: 'PASO_2_COBRAR_COASEGURO',
        orden: 2,
        ejecutar: step2Ejecutar,
        compensar: step2Compensar,
      },
    ];

    const result = await sagaOrchestrator.executeSaga(
      'TestFailingSaga',
      { pacienteId: 20 },
      pasos,
    );

    expect(result.estado).toBe('COMPENSADA');
    expect(result.error).toContain('Fondos insuficientes en coaseguro');
    expect(step1Compensar).toHaveBeenCalledTimes(1);
    expect(step2Compensar).not.toHaveBeenCalled();
  });
});

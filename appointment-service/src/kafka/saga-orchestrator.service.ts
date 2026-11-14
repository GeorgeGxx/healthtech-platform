import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstanciaSaga } from '../entities/instancia-saga.entity.js';
import { AppointmentKafkaProducerService } from './kafka-producer.service.js';
import { SagaStepDefinition, SagaStep } from './saga.interfaces.js';

export type { SagaStepDefinition, SagaStep };

@Injectable()
export class SagaOrchestratorService {
  private readonly logger = new Logger(SagaOrchestratorService.name);

  constructor(
    @InjectRepository(InstanciaSaga)
    private readonly sagaRepo: Repository<InstanciaSaga>,
    private readonly kafka: AppointmentKafkaProducerService,
  ) {}

  async executeSaga(
    nombreSaga: string,
    contextoInicial: any,
    pasos: SagaStepDefinition<any>[],
  ) {
    const saga = this.sagaRepo.create({
      nombreSaga,
      estado: 'INICIADA',
      pasoActual: 1,
      totalPasos: pasos.length,
      datosContexto: contextoInicial,
      historialPasos: [],
      compensacionRequerida: false,
    });
    const saved = await this.sagaRepo.save(saga);
    const idSaga = saved.idSaga;

    await this.kafka.emit(
      'healthtech.sagas.events.v1',
      `saga.${nombreSaga}.initiated`,
      'SagaInstance',
      idSaga,
      { idSaga, nombreSaga, contextoInicial },
      { sagaId: idSaga },
    );

    let contextoActual = { ...contextoInicial };
    const historial: any[] = [];
    const pasosExitosos: SagaStepDefinition<any>[] = [];

    for (const paso of pasos) {
      try {
        saved.estado = 'EN_PROCESO';
        saved.pasoActual = paso.orden;
        await this.sagaRepo.save(saved);

        const { resultado, contextoActualizado } = await paso.ejecutar(contextoActual);
        if (contextoActualizado) {
          contextoActual = { ...contextoActual, ...contextoActualizado };
        }

        historial.push({
          pasoNumero: paso.orden,
          nombrePaso: paso.nombrePaso,
          estado: 'EXITO',
          timestamp: new Date().toISOString(),
          detalles: resultado,
        });
        pasosExitosos.push(paso);
        saved.historialPasos = historial;
        saved.datosContexto = contextoActual;
        await this.sagaRepo.save(saved);

        await this.kafka.emit(
          'healthtech.sagas.events.v1',
          `saga.${nombreSaga}.step_${paso.orden}.completed`,
          'SagaInstance',
          idSaga,
          { idSaga, nombreSaga, paso: paso.nombrePaso, resultado },
          { sagaId: idSaga },
        );
      } catch (err: any) {
        this.logger.error(`[Saga ${nombreSaga}] Failed at step ${paso.orden}: ${err.message}`);
        historial.push({
          pasoNumero: paso.orden,
          nombrePaso: paso.nombrePaso,
          estado: 'FALLO',
          error: err.message,
          timestamp: new Date().toISOString(),
        });

        // Reverse compensation (LIFO)
        saved.estado = 'COMPENSANDO';
        saved.compensacionRequerida = true;
        saved.errorDetalle = err.message;
        await this.sagaRepo.save(saved);

        for (const p of [...pasosExitosos].reverse()) {
          try {
            await p.compensar(contextoActual, err);
            historial.push({
              pasoNumero: p.orden,
              nombrePaso: `COMPENSADO_${p.nombrePaso}`,
              estado: 'COMPENSADO',
              timestamp: new Date().toISOString(),
            });
          } catch (compErr: any) {
            this.logger.error(`Error compensating step ${p.nombrePaso}: ${compErr.message}`);
          }
        }

        saved.estado = 'COMPENSADA';
        saved.historialPasos = historial;
        await this.sagaRepo.save(saved);

        await this.kafka.emit(
          'healthtech.sagas.events.v1',
          `saga.${nombreSaga}.compensated`,
          'SagaInstance',
          idSaga,
          { idSaga, error: err.message },
          { sagaId: idSaga },
        );

        return {
          idSaga,
          nombreSaga,
          estado: 'COMPENSADA',
          error: err.message,
          totalPasos: pasos.length,
          pasosCompletados: pasosExitosos.length,
          historial,
          contextoFinal: contextoActual,
        };
      }
    }

    saved.estado = 'COMPLETADA';
    saved.historialPasos = historial;
    saved.datosContexto = contextoActual;
    await this.sagaRepo.save(saved);

    await this.kafka.emit(
      'healthtech.sagas.events.v1',
      `saga.${nombreSaga}.completed`,
      'SagaInstance',
      idSaga,
      { idSaga, nombreSaga, contextoFinal: contextoActual },
      { sagaId: idSaga },
    );

    return {
      idSaga,
      nombreSaga,
      estado: 'COMPLETADA',
      totalPasos: pasos.length,
      pasosCompletados: pasosExitosos.length,
      historial,
      contextoFinal: contextoActual,
    };
  }
}

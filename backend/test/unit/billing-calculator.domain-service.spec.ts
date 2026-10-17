import { describe, it, expect } from 'vitest';
import { BillingCalculatorDomainService } from '../../src/domain/services/billing-calculator.domain-service.js';

describe('TDD: BillingCalculatorDomainService', () => {
  it('debe calcular correctamente 80% de cobertura (ej: OSDE)', () => {
    const result = BillingCalculatorDomainService.calculate({
      basePrice: 25000,
      coveragePercentage: 80,
    });

    expect(result.discountAmount).toBe(20000);
    expect(result.patientCopayAmount).toBe(5000);
  });

  it('debe calcular correctamente 100% de cobertura (ej: PAMI)', () => {
    const result = BillingCalculatorDomainService.calculate({
      basePrice: 25000,
      coveragePercentage: 100,
    });

    expect(result.discountAmount).toBe(25000);
    expect(result.patientCopayAmount).toBe(0);
  });

  it('debe calcular correctamente 0% de cobertura (Particular)', () => {
    const result = BillingCalculatorDomainService.calculate({
      basePrice: 15000,
      coveragePercentage: 0,
    });

    expect(result.discountAmount).toBe(0);
    expect(result.patientCopayAmount).toBe(15000);
  });

  it('debe lanzar error si el precio base es negativo', () => {
    expect(() =>
      BillingCalculatorDomainService.calculate({
        basePrice: -100,
        coveragePercentage: 50,
      }),
    ).toThrow('El precio base no puede ser negativo');
  });

  it('debe lanzar error si el porcentaje de cobertura excede el 100%', () => {
    expect(() =>
      BillingCalculatorDomainService.calculate({
        basePrice: 10000,
        coveragePercentage: 110,
      }),
    ).toThrow('El porcentaje de cobertura debe estar entre 0 y 100');
  });
});

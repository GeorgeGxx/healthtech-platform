import { describe, it, expect } from 'vitest';
import { BillingCalculatorDomainService } from '../../src/domain/billing-calculator.domain-service.js';

describe('BillingCalculatorDomainService', () => {
  it('calculates 80% insurance coverage accurately', () => {
    const result = BillingCalculatorDomainService.calculate({
      basePrice: 25000,
      coveragePercentage: 80,
    });

    expect(result.discountAmount).toBe(20000);
    expect(result.patientCopayAmount).toBe(5000);
  });

  it('calculates 100% insurance coverage accurately', () => {
    const result = BillingCalculatorDomainService.calculate({
      basePrice: 25000,
      coveragePercentage: 100,
    });

    expect(result.discountAmount).toBe(25000);
    expect(result.patientCopayAmount).toBe(0);
  });

  it('calculates 0% coverage (Self-Pay) accurately', () => {
    const result = BillingCalculatorDomainService.calculate({
      basePrice: 15000,
      coveragePercentage: 0,
    });

    expect(result.discountAmount).toBe(0);
    expect(result.patientCopayAmount).toBe(15000);
  });

  it('preserves exact cent sum invariant (discount + copay === basePrice) on fractional inputs', () => {
    const result = BillingCalculatorDomainService.calculate({
      basePrice: 19.99,
      coveragePercentage: 33.33,
    });

    expect(Math.round((result.discountAmount + result.patientCopayAmount) * 100)).toBe(1999);
  });

  it('throws error when base price is negative', () => {
    expect(() =>
      BillingCalculatorDomainService.calculate({
        basePrice: -100,
        coveragePercentage: 50,
      }),
    ).toThrow('Base price cannot be negative');
  });

  it('throws error when coverage percentage exceeds 100%', () => {
    expect(() =>
      BillingCalculatorDomainService.calculate({
        basePrice: 10000,
        coveragePercentage: 110,
      }),
    ).toThrow('Coverage percentage must be between 0 and 100');
  });
});

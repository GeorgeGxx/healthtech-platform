export interface CoverageCalculationInput {
  basePrice: number;
  coveragePercentage: number;
}

export interface CoverageCalculationResult {
  basePrice: number;
  coveragePercentage: number;
  discountAmount: number;
  patientCopayAmount: number;
}

export class BillingCalculatorDomainService {
  static calculate(input: CoverageCalculationInput): CoverageCalculationResult {
    if (input.basePrice < 0) {
      throw new Error('El precio base no puede ser negativo');
    }
    if (input.coveragePercentage < 0 || input.coveragePercentage > 100) {
      throw new Error('El porcentaje de cobertura debe estar entre 0 y 100');
    }

    const discountAmount = Number(
      ((input.basePrice * input.coveragePercentage) / 100).toFixed(2),
    );
    const patientCopayAmount = Number(
      (input.basePrice - discountAmount).toFixed(2),
    );

    return {
      basePrice: input.basePrice,
      coveragePercentage: input.coveragePercentage,
      discountAmount,
      patientCopayAmount,
    };
  }
}

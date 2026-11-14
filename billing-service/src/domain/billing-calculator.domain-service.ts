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
    if (!Number.isFinite(input.basePrice) || input.basePrice < 0) {
      throw new Error('Base price cannot be negative');
    }
    if (
      !Number.isFinite(input.coveragePercentage) ||
      input.coveragePercentage < 0 ||
      input.coveragePercentage > 100
    ) {
      throw new Error('Coverage percentage must be between 0 and 100');
    }

    // Use integer-cent arithmetic to prevent binary floating-point rounding drift
    const baseCents = Math.round(input.basePrice * 100);
    const discountCents = Math.round((baseCents * input.coveragePercentage) / 100);
    const copayCents = baseCents - discountCents;

    return {
      basePrice: baseCents / 100,
      coveragePercentage: input.coveragePercentage,
      discountAmount: discountCents / 100,
      patientCopayAmount: copayCents / 100,
    };
  }
}

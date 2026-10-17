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
export declare class BillingCalculatorDomainService {
    static calculate(input: CoverageCalculationInput): CoverageCalculationResult;
}

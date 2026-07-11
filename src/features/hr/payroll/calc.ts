/**
 * Hàm tính lương thuần (không phụ thuộc DB) để dễ kiểm thử.
 */

export type TaxBracket = { upTo: number | null; rate: number };

/** Thuế TNCN lũy tiến từng phần trên thu nhập tính thuế (đã trừ giảm trừ). */
export function computeProgressiveTax(
  taxableIncome: number,
  brackets: TaxBracket[]
): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  let lower = 0;
  for (const b of brackets) {
    const upper = b.upTo ?? Infinity;
    if (taxableIncome > lower) {
      const portion = Math.min(taxableIncome, upper) - lower;
      tax += portion * b.rate;
      lower = upper;
    } else {
      break;
    }
  }
  return Math.round(tax);
}

export type PayslipInput = {
  baseSalary: number;
  allowances: number;
  overtimePay: number;
  otherAdjustments: number; // thưởng (+) / phạt (-)
  insuranceRate: number; // BHXH+BHYT+BHTN cộng gộp
  insuranceCap?: number; // trần thu nhập đóng BH (20× lương cơ sở)
  personalDeduction: number;
  dependentDeduction: number;
  dependents: number;
  taxBrackets: TaxBracket[];
};

export type PayslipResult = {
  grossPay: number;
  insuranceDeduction: number;
  taxDeduction: number;
  otherDeduction: number;
  netPay: number;
};

/** Tính 1 phiếu lương từ các thành phần đầu vào. */
export function computePayslip(i: PayslipInput): PayslipResult {
  const gross =
    i.baseSalary + i.allowances + i.overtimePay + i.otherAdjustments;

  // BHXH/BHYT/BHTN tính trên lương cơ bản, áp trần nếu có (20× lương cơ sở).
  const insuranceBase =
    i.insuranceCap && i.insuranceCap > 0
      ? Math.min(i.baseSalary, i.insuranceCap)
      : i.baseSalary;
  const insurance = Math.round(insuranceBase * i.insuranceRate);

  const deductions =
    i.personalDeduction + i.dependents * i.dependentDeduction;
  const taxable = Math.max(0, gross - insurance - deductions);
  const tax = computeProgressiveTax(taxable, i.taxBrackets);

  const otherDeduction = 0;
  const net = gross - insurance - tax - otherDeduction;

  return {
    grossPay: Math.round(gross),
    insuranceDeduction: insurance,
    taxDeduction: tax,
    otherDeduction,
    netPay: Math.round(net)
  };
}

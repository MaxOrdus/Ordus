/**
 * Settlement Calculator
 * Calculates net settlement after all deductions
 * Based on Ontario PI practice requirements
 */

export interface SettlementCalculation {
  grossSettlement: number
  legalFee: number
  legalFeePercentage: number
  hst: number
  disbursements: number
  subrogation: number
  sabsDeduction: number
  tortDeductible: number
  netToClient: number
  breakdown: SettlementBreakdown[]
}

export interface SettlementBreakdown {
  label: string
  amount: number
  type: 'deduction' | 'addition'
}

const TORT_DEDUCTIBLE_THRESHOLD = 46000 // Approximate statutory deductible
const HST_RATE = 0.13

/**
 * Calculate net settlement after all deductions
 */
export function calculateNetSettlement(
  grossSettlement: number,
  legalFeePercentage: number = 0.30,
  disbursements: number = 0,
  subrogation: number = 0,
  sabsPaid: number = 0,
  isPainAndSuffering: boolean = true,
  isOverThreshold: boolean = false
): SettlementCalculation {
  // Legal fee
  const legalFee = grossSettlement * legalFeePercentage
  const hst = legalFee * HST_RATE
  
  // SABS deduction (applied to economic damages in Tort)
  const sabsDeduction = sabsPaid
  
  // Tort deductible (applies to pain and suffering if under threshold)
  let tortDeductible = 0
  if (isPainAndSuffering && !isOverThreshold && grossSettlement < TORT_DEDUCTIBLE_THRESHOLD) {
    tortDeductible = Math.min(grossSettlement, TORT_DEDUCTIBLE_THRESHOLD)
  }
  
  // Calculate net
  const totalDeductions = legalFee + hst + disbursements + subrogation + sabsDeduction + tortDeductible
  const netToClient = grossSettlement - totalDeductions
  
  const breakdown: SettlementBreakdown[] = [
    { label: 'Gross Settlement', amount: grossSettlement, type: 'addition' },
    { label: `Legal Fee (${(legalFeePercentage * 100).toFixed(0)}%)`, amount: -legalFee, type: 'deduction' },
    { label: 'HST on Legal Fee', amount: -hst, type: 'deduction' },
    { label: 'Disbursements', amount: -disbursements, type: 'deduction' },
    { label: 'Subrogation (OHIP, etc.)', amount: -subrogation, type: 'deduction' },
    { label: 'SABS Deduction', amount: -sabsDeduction, type: 'deduction' },
    { label: 'Tort Deductible', amount: -tortDeductible, type: 'deduction' },
    { label: 'Net to Client', amount: netToClient, type: 'addition' },
  ]
  
  return {
    grossSettlement,
    legalFee,
    legalFeePercentage,
    hst,
    disbursements,
    subrogation,
    sabsDeduction,
    tortDeductible,
    netToClient,
    breakdown,
  }
}

/**
 * Calculate SABS/Tort interaction
 * Shows if Tort claim has economic value after SABS deduction
 */
export function calculateSABSTortInteraction(
  tortIncomeLoss: number,
  sabsIRBPaid: number,
  tortFutureLoss: number = 0,
  sabsFutureIRB: number = 0
): {
  pastLossValue: number
  futureLossValue: number
  hasEconomicValue: boolean
  warning?: string
} {
  const pastLossValue = Math.max(0, tortIncomeLoss - sabsIRBPaid)
  const futureLossValue = Math.max(0, tortFutureLoss - sabsFutureIRB)
  const totalEconomicValue = pastLossValue + futureLossValue
  
  let warning: string | undefined
  if (sabsIRBPaid > tortIncomeLoss) {
    warning = `Warning: SABS IRB deduction ($${sabsIRBPaid.toLocaleString()}) exceeds estimated Tort Past Income Loss ($${tortIncomeLoss.toLocaleString()}). Tort claim has zero economic value for past loss.`
  }
  
  return {
    pastLossValue,
    futureLossValue,
    hasEconomicValue: totalEconomicValue > 0,
    warning,
  }
}


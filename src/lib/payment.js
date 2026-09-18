// Phase 6: payments are UI-only for the prototype (no real gateway),
// exactly as agreed. This just does the math for the breakdown shown
// on the Payment Summary screen.
//
// Phase 7 connection: WELFARE_PERCENT of the base price is shown as
// going to the Worker Welfare Fund - it's part of the platform fee,
// not an extra charge to the customer. This is also the exact number
// used when we insert a row into welfare_contributions.

export const PLATFORM_FEE_PERCENT = 10
export const WELFARE_PERCENT = 5 // sits inside the platform fee, not on top of it

function round2(n) {
  return Math.round(n * 100) / 100
}

export function computeBreakdown(basePrice) {
  const platformFee = round2(basePrice * (PLATFORM_FEE_PERCENT / 100))
  const welfareContribution = round2(basePrice * (WELFARE_PERCENT / 100))
  const workerPayout = round2(basePrice - platformFee)
  return { basePrice, platformFee, welfareContribution, workerPayout }
}

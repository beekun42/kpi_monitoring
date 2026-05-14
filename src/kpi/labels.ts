/** Display labels (Excel A列ベース。Luxuryは初版スコープ外) */
export const METRIC_TITLE: Record<string, string> = {
  gms_ttl: 'GMS（TTL）',
  high_gms: 'High GMS',
  low_gms: 'Low GMS',
  gms: 'GMS',
  'buyer.buyer': 'Buyer（UU）',
  'buyer.newr13': 'NewR13-',
  'buyer.r212': 'R2-12',
  'buyer.r1': 'R1',
  'buyer.rr': 'RR',
  'buyer.spending': 'Spending',
  'seller.listing': 'Listing',
  'seller.seller': 'Seller（UU）',
  'seller.newr13': 'NewR13-',
  'seller.r212': 'R2-12',
  'seller.r1': 'R1',
  'seller.rr': 'RR',
  'seller.freq': 'Freq',
  'seller.order': 'Order',
  'seller.soldout_rate': 'Sold out rate',
  'seller.aov': 'AOV',
}

/** Buyer: GMSに近い2本柱（UU・Spending）＋UU配下の構成比（Miroツリーに寄せた形） */
export const BUYER_ROOT = 'buyer.buyer' as const
export const BUYER_COHORTS = [
  'buyer.newr13',
  'buyer.r212',
  'buyer.r1',
  'buyer.rr',
] as const
export const BUYER_SPENDING = 'buyer.spending' as const

export const BUYER_CHAIN = [
  BUYER_ROOT,
  ...BUYER_COHORTS,
  BUYER_SPENDING,
] as const

export const SELLER_LISTING = 'seller.listing' as const
export const SELLER_UU = 'seller.seller' as const
export const SELLER_COHORTS = [
  'seller.newr13',
  'seller.r212',
  'seller.r1',
  'seller.rr',
] as const
export const SELLER_FREQ = 'seller.freq' as const
export const SELLER_FUNNEL = ['seller.order', 'seller.soldout_rate', 'seller.aov'] as const

/** 全Seller指標の平坦リスト（ツリー階層の説明順に近い並び） */
export const SELLER_CHAIN = [
  SELLER_FUNNEL[0],
  SELLER_FUNNEL[2],
  SELLER_LISTING,
  SELLER_FUNNEL[1],
  SELLER_UU,
  ...SELLER_COHORTS,
  SELLER_FREQ,
] as const

export function titleFor(metricId: string): string {
  return METRIC_TITLE[metricId] ?? metricId
}

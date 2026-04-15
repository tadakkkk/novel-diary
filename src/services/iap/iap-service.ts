// ── Apple In-App Purchase Service (via RevenueCat) ───────────────────────────
// Only active on native iOS. Web falls back to Paddle.

import { Capacitor } from '@capacitor/core'

export const IAP_PRODUCTS = {
  weekly:  'com.tadaktadak.app.weekly',
  monthly: 'com.tadaktadak.app.monthly',
} as const

export type IAPPlan = keyof typeof IAP_PRODUCTS

// RevenueCat API key — replace with actual key from RevenueCat dashboard
const RC_API_KEY_IOS = import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

// Lazy-load Purchases to avoid crashing on web
async function getPurchases() {
  const { Purchases } = await import('@revenuecat/purchases-capacitor')
  return Purchases
}

export async function initIAP(): Promise<void> {
  if (!isNativePlatform()) return
  if (!RC_API_KEY_IOS) {
    console.warn('[iap] VITE_REVENUECAT_IOS_KEY not set — IAP disabled')
    return
  }
  const Purchases = await getPurchases()
  await Purchases.configure({ apiKey: RC_API_KEY_IOS })
  console.log('[iap] RevenueCat configured')
}

export interface IAPProduct {
  productIdentifier: string
  localizedTitle: string
  localizedDescription: string
  localizedPriceString: string
}

export async function fetchIAPProducts(): Promise<IAPProduct[]> {
  const Purchases = await getPurchases()
  const offerings = await Purchases.getOfferings()
  const current = offerings.current
  if (!current) return []

  return current.availablePackages
    .map(pkg => ({
      productIdentifier: pkg.product.identifier,
      localizedTitle: pkg.product.title,
      localizedDescription: pkg.product.description,
      localizedPriceString: pkg.product.priceString,
    }))
}

export async function purchaseIAP(plan: IAPPlan): Promise<boolean> {
  const Purchases = await getPurchases()
  const offerings = await Purchases.getOfferings()
  const current = offerings.current
  if (!current) throw new Error('No offerings available')

  const pkg = current.availablePackages.find(
    p => p.product.identifier === IAP_PRODUCTS[plan]
  )
  if (!pkg) throw new Error(`Product not found: ${IAP_PRODUCTS[plan]}`)

  const result = await Purchases.purchasePackage({ aPackage: pkg })
  return result.customerInfo.entitlements.active['premium'] !== undefined
}

export async function restoreIAPPurchases(): Promise<boolean> {
  const Purchases = await getPurchases()
  const { customerInfo } = await Purchases.restorePurchases()
  return customerInfo.entitlements.active['premium'] !== undefined
}

export async function checkIAPEntitlement(): Promise<boolean> {
  if (!isNativePlatform()) return false
  try {
    const Purchases = await getPurchases()
    const { customerInfo } = await Purchases.getCustomerInfo()
    return customerInfo.entitlements.active['premium'] !== undefined
  } catch {
    return false
  }
}

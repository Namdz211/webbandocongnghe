import { formatCurrency } from './formatters.js'

export function getCouponValue(coupon, camelKey, pascalKey) {
  return coupon?.[camelKey] ?? coupon?.[pascalKey]
}

export function getCouponCode(coupon) {
  return String(getCouponValue(coupon, 'code', 'Code') || '').trim().toUpperCase()
}

export function getCouponDiscountText(coupon) {
  const discountType = getCouponValue(coupon, 'discountType', 'DiscountType')
  const discountValue = Number(getCouponValue(coupon, 'discountValue', 'DiscountValue') || 0)

  if (discountType === 'percent') {
    return `Giảm ${discountValue}%`
  }

  return `Giảm ${formatCurrency(discountValue)}`
}

export function getCouponMeta(coupon) {
  const minOrderAmount = Number(getCouponValue(coupon, 'minOrderAmount', 'MinOrderAmount') || 0)
  const maxDiscountAmount = Number(getCouponValue(coupon, 'maxDiscountAmount', 'MaxDiscountAmount') || 0)
  const expiryDate = getCouponValue(coupon, 'expiryDate', 'ExpiryDate')
  const meta = []

  if (minOrderAmount > 0) {
    meta.push(`Đơn từ ${formatCurrency(minOrderAmount)}`)
  }

  if (maxDiscountAmount > 0) {
    meta.push(`Tối đa ${formatCurrency(maxDiscountAmount)}`)
  }

  if (expiryDate) {
    meta.push(`HSD ${new Date(expiryDate).toLocaleDateString('vi-VN')}`)
  }

  return meta.join(' • ')
}

export function isCouponExpired(coupon) {
  const expiryDate = getCouponValue(coupon, 'expiryDate', 'ExpiryDate')

  if (!expiryDate) {
    return false
  }

  return new Date(expiryDate).getTime() < Date.now()
}

export function isCouponUsable(coupon, orderAmount) {
  if (!coupon || isCouponExpired(coupon)) {
    return false
  }

  const isActive = getCouponValue(coupon, 'isActive', 'IsActive')
  const usageLimit = Number(getCouponValue(coupon, 'usageLimit', 'UsageLimit') || 0)
  const usedCount = Number(getCouponValue(coupon, 'usedCount', 'UsedCount') || 0)

  if (isActive === false || (usageLimit > 0 && usedCount >= usageLimit)) {
    return false
  }

  const minOrderAmount = Number(getCouponValue(coupon, 'minOrderAmount', 'MinOrderAmount') || 0)
  return Number(orderAmount || 0) >= minOrderAmount
}

export function getCouponDiscountAmount(coupon, orderAmount) {
  const amount = Number(orderAmount || 0)

  if (!isCouponUsable(coupon, amount)) {
    return 0
  }

  const discountType = getCouponValue(coupon, 'discountType', 'DiscountType')
  const discountValue = Number(getCouponValue(coupon, 'discountValue', 'DiscountValue') || 0)
  const maxDiscountAmount = Number(getCouponValue(coupon, 'maxDiscountAmount', 'MaxDiscountAmount') || 0)
  let discountAmount = discountValue

  if (discountType === 'percent') {
    discountAmount = Math.round((amount * discountValue) / 100)

    if (maxDiscountAmount > 0) {
      discountAmount = Math.min(discountAmount, maxDiscountAmount)
    }
  }

  return Math.min(Math.max(discountAmount, 0), amount)
}

export function mergeSavedCoupons(currentCoupons, coupon) {
  const code = getCouponCode(coupon)

  if (!code) {
    return Array.isArray(currentCoupons) ? currentCoupons : []
  }

  const withoutDuplicate = (Array.isArray(currentCoupons) ? currentCoupons : [])
    .filter((item) => getCouponCode(item) !== code)

  return [{ ...coupon, code }, ...withoutDuplicate]
}

export function getDisplayName(value, fallback = '') {
  if (value === null || value === undefined) {
    return fallback
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'object') {
    return value.name || value.Name || value.title || value.Title || fallback
  }

  return fallback
}

export function getManufacturerName(product) {
  return getDisplayName(product?.manufacturer || product?.manufacturerName, '')
}

export function getCategoryName(product, fallback = 'Sản phẩm') {
  return getDisplayName(product?.category || product?.categoryName, fallback)
}

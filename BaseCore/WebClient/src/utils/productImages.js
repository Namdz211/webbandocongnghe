import {
  CATEGORY_FALLBACK_IMAGES,
  FALLBACK_IMAGES,
  REAL_PRODUCT_IMAGE_BASE_URL,
  REAL_PRODUCT_IMAGE_PARAMS,
} from '../constants/images.js'

export function normalizeProductImageUrl(rawImageUrl) {
  const imageUrl = rawImageUrl?.trim()

  if (!imageUrl) {
    return ''
  }

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  const normalizedPath = imageUrl.replace(/\\/g, '/')

  if (normalizedPath.startsWith('/electro/img/')) {
    return normalizedPath
  }

  if (normalizedPath.startsWith('electro/img/')) {
    return `/${normalizedPath}`
  }

  if (normalizedPath.startsWith('/img/')) {
    return normalizedPath
  }

  if (normalizedPath.startsWith('img/')) {
    return `/${normalizedPath}`
  }

  if (/^[a-zA-Z]:\//.test(normalizedPath) || normalizedPath.startsWith('file:///')) {
    const fileName = normalizedPath.split('/').filter(Boolean).pop()
    return fileName ? `/electro/img/${fileName}` : ''
  }

  if (normalizedPath.startsWith('/')) {
    return normalizedPath
  }

  const fileName = normalizedPath.split('/').filter(Boolean).pop()
  return fileName ? `/electro/img/${fileName}` : ''
}
export function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
export function getProductCategoryName(product) {
  return (
    product?.category?.name ||
    product?.categoryName ||
    (typeof product?.category === 'string' ? product.category : '') ||
    ''
  )
}
export function getLocalProductFallback(product) {
  const categoryName = normalizeSearchText(getProductCategoryName(product))
  const categoryFallback = CATEGORY_FALLBACK_IMAGES.find((item) =>
    item.keywords.some((keyword) => categoryName.includes(keyword)),
  )

  if (categoryFallback) {
    return categoryFallback.image
  }

  const fallbackIndex = Number(product?.id || 0) % FALLBACK_IMAGES.length
  return FALLBACK_IMAGES[fallbackIndex]
}
export function getRealProductImage(product) {
  const productName = product?.name?.trim()

  if (!productName) {
    return ''
  }

  const query = encodeURIComponent(`${productName} official product photo`)
  return `${REAL_PRODUCT_IMAGE_BASE_URL}?${REAL_PRODUCT_IMAGE_PARAMS}&q=${query}`
}
export function getProductImage(product) {
  const imageUrl = normalizeProductImageUrl(product?.imageUrl)

  if (imageUrl) {
    return imageUrl
  }

  return getRealProductImage(product) || getLocalProductFallback(product)
}
export function handleProductImageError(event, product) {
  const imageElement = event.currentTarget

  if (imageElement.dataset.fallbackApplied === 'true') {
    return
  }

  imageElement.dataset.fallbackApplied = 'true'
  imageElement.src = getLocalProductFallback(product)
}

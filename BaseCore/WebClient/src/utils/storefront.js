const FALLBACK_IMAGES = [
  '/electro/img/product01.png',
  '/electro/img/product02.png',
  '/electro/img/product03.png',
  '/electro/img/product04.png',
  '/electro/img/product05.png',
  '/electro/img/product06.png',
  '/electro/img/product07.png',
  '/electro/img/product08.png',
  '/electro/img/macbookneo.png',
]

const CATEGORY_FALLBACK_IMAGES = [
  { keywords: ['dien thoai', 'phone'], image: '/electro/img/product02.png' },
  { keywords: ['laptop'], image: '/electro/img/product01.png' },
  { keywords: ['smartwatch', 'watch'], image: '/electro/img/product09.png' },
  { keywords: ['tablet'], image: '/electro/img/product04.png' },
]

const REAL_PRODUCT_IMAGE_BASE_URL = 'https://tse.mm.bing.net/th'
const REAL_PRODUCT_IMAGE_PARAMS = 'w=360&h=360&c=7&rs=1&p=0&dpr=1&pid=1.7&mkt=vi-VN'

export const SHOP_IMAGES = [
  '/electro/img/shop01.png',
  '/electro/img/shop02.png',
  '/electro/img/shop03.png',
]

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export const STORAGE_KEYS = {
  auth: 'electro-store-auth',
  cart: 'electro-store-cart',
}

export const ORDER_REFRESH_INTERVAL_MS = 5000

export const ORDER_STATUS_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ xác nhận' },
  { id: 'confirmed', label: 'Đã xác nhận' },
  { id: 'shipping', label: 'Đang giao' },
  { id: 'completed', label: 'Đã nhận' },
  { id: 'cancelled', label: 'Đã hủy' },
]

export const PAYMENT_METHODS = [
  {
    id: 'cod',
    name: 'Thanh to\u00e1n khi nh\u1eadn h\u00e0ng (COD)',
    description: 'Tr\u1ea3 ti\u1ec1n m\u1eb7t cho nh\u00e2n vi\u00ean giao h\u00e0ng sau khi nh\u1eadn s\u1ea3n ph\u1ea9m.',
    icon: 'fa-truck',
  },
  {
    id: 'bank_transfer',
    name: 'Chuy\u1ec3n kho\u1ea3n ng\u00e2n h\u00e0ng',
    description: 'Chuy\u1ec3n kho\u1ea3n theo m\u00e3 thanh to\u00e1n c\u1ee7a \u0111\u01a1n h\u00e0ng.',
    icon: 'fa-university',
  },
  {
    id: 'e_wallet',
    name: 'V\u00ed \u0111i\u1ec7n t\u1eed',
    description: 'Thanh to\u00e1n qua v\u00ed \u0111i\u1ec7n t\u1eed v\u00e0 h\u1ec7 th\u1ed1ng ghi nh\u1eadn thanh to\u00e1n ngay.',
    icon: 'fa-credit-card',
  },
]

export function readStorage(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallbackValue
  } catch {
    return fallbackValue
  }
}

export function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getAuthToken(auth) {
  return auth?.token || auth?.Token || ''
}

export function getAuthUserId(auth) {
  return auth?.userId || auth?.UserId || auth?.id || auth?.Id || ''
}

export function getJwtPayload(token) {
  if (!token) {
    return null
  }

  try {
    const payload = token.split('.')[1]
    if (!payload) {
      return null
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    )

    return JSON.parse(window.atob(padded))
  } catch {
    return null
  }
}

export function isExpiredToken(token) {
  const payload = getJwtPayload(token)

  if (!payload?.exp) {
    return false
  }

  return payload.exp * 1000 <= Date.now()
}

export function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0))
}

export function formatDate(value) {
  if (!value) {
    return 'N/A'
  }

  try {
    return dateFormatter.format(new Date(value))
  } catch {
    return value
  }
}

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

export function toOrderStatusLabel(status) {
  switch ((status || '').toLowerCase()) {
    case 'pending':
      return 'Ch\u1edd x\u00e1c nh\u1eadn'
    case 'confirmed':
      return '\u0110\u00e3 x\u00e1c nh\u1eadn'
    case 'shipping':
      return '\u0110ang giao h\u00e0ng'
    case 'completed':
      return '\u0110\u00e3 nh\u1eadn h\u00e0ng'
    case 'cancelled':
      return '\u0110\u00e3 h\u1ee7y'
    default:
      return '\u0110ang x\u1eed l\u00fd'
  }
}

export function buildStorePath({
  keyword = '',
  categoryId = '',
  page = 1,
} = {}) {
  const params = new URLSearchParams()
  const normalizedKeyword = keyword.trim()

  if (normalizedKeyword) {
    params.set('keyword', normalizedKeyword)
  }

  if (categoryId) {
    params.set('categoryId', String(categoryId))
  }

  if (page > 1) {
    params.set('page', String(page))
  }

  const query = params.toString()
  return query ? `/store?${query}` : '/store'
}

export function parseRoute() {
  const url = new URL(window.location.href)
  const pathname = url.pathname.replace(/\/+$/, '') || '/'
  const query = Object.fromEntries(url.searchParams.entries())

  if (pathname === '/' || pathname === '') {
    return { name: 'home', pathname: '/', query }
  }

  if (pathname === '/store') {
    return { name: 'store', pathname, query }
  }

  if (pathname.startsWith('/product/')) {
    return {
      name: 'product',
      pathname,
      query,
      params: { id: pathname.split('/').pop() },
    }
  }

  if (pathname === '/checkout') {
    return { name: 'checkout', pathname, query }
  }

  if (pathname === '/orders') {
    return { name: 'orders', pathname, query }
  }

  if (pathname === '/account') {
    return { name: 'account', pathname, query }
  }

  if (pathname === '/login') {
    return { name: 'login', pathname, query }
  }

  return { name: 'notFound', pathname, query }
}

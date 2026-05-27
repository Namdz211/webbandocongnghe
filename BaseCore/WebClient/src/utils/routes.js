export function buildStorePath({
  keyword = '',
  categoryId = '',
  manufacturer = '',
  minPrice = '',
  maxPrice = '',
  sortBy = '',
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

  if (manufacturer) {
    params.set('manufacturer', String(manufacturer))
  }

  if (minPrice) {
    params.set('minPrice', String(minPrice))
  }

  if (maxPrice) {
    params.set('maxPrice', String(maxPrice))
  }

  if (sortBy && sortBy !== 'recent') {
    params.set('sortBy', String(sortBy))
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
  const hash = url.hash

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
      hash,
      params: { id: pathname.split('/').pop() },
    }
  }

  if (pathname === '/checkout') {
    return { name: 'checkout', pathname, query }
  }

  if (pathname === '/orders') {
    return { name: 'orders', pathname, query }
  }

  if (pathname === '/admin' || pathname === '/admin/login') {
    return { name: pathname === '/admin/login' ? 'adminLogin' : 'adminDashboard', pathname, query }
  }

  if (pathname === '/admin/products') {
    return { name: 'adminProducts', pathname, query }
  }

  if (pathname === '/admin/categories') {
    return { name: 'adminCategories', pathname, query }
  }

  if (pathname === '/admin/users') {
    return { name: 'adminUsers', pathname, query }
  }

  if (pathname === '/admin/orders') {
    return { name: 'adminOrders', pathname, query }
  }

  if (pathname === '/account') {
    return { name: 'account', pathname, query }
  }

  if (pathname === '/login') {
    return { name: 'login', pathname, query }
  }

  return { name: 'notFound', pathname, query }
}

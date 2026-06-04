import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client.js'
import ProductCard from '../components/ProductCard.jsx'
import { buildStorePath } from '../utils/routes.js'

const SORT_OPTIONS = [
  {
    value: 'recent',
    label: 'Gần đây nhất',
    icon: 'fa-clock-o',
  },
  {
    value: 'bestSelling',
    label: 'Bán chạy',
    icon: 'fa-fire',
  },
  {
    value: 'priceAsc',
    label: 'Giá bán tăng dần',
    icon: 'fa-sort-amount-asc',
  },
  {
    value: 'priceDesc',
    label: 'Giá bán giảm dần',
    icon: 'fa-sort-amount-desc',
  },
]

function formatDateValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultSalesDateRange() {
  const today = new Date()
  return {
    startDate: formatDateValue(new Date(today.getFullYear(), today.getMonth(), 1)),
    endDate: formatDateValue(today),
  }
}

const BRAND_COLORS = {
  acer: '#83b81a',
  amazfit: '#ff4f00',
  apple: '#111827',
  asus: '#00539b',
  coros: '#111827',
  dell: '#0076ce',
  fitbit: '#00b0b9',
  garmin: '#007cc3',
  google: '#4285f4',
  haylou: '#ff6f00',
  honor: '#00a7e1',
  hp: '#0096d6',
  huawei: '#d71920',
  ipad: '#111827',
  iphone: '#111827',
  lenovo: '#e2231a',
  lg: '#a50034',
  microsoft: '#5e5e5e',
  msi: '#d71920',
  nokia: '#124191',
  oppo: '#0f7d3b',
  realme: '#f5c400',
  samsung: '#1428a0',
  vivo: '#315fff',
  xiaomi: '#ff6900',
}

const BRAND_LOGOS = {
  acer: '/electro/img/brands/acer.png',
  amazfit: '/electro/img/brands/amazfit.png',
  apple: '/electro/img/brands/apple.png',
  asus: '/electro/img/brands/asus.webp',
  coros: '/electro/img/brands/coros.png',
  dell: '/electro/img/brands/dell.webp',
  fitbit: '/electro/img/brands/fitbit.png',
  garmin: '/electro/img/brands/garmin.png',
  google: '/electro/img/brands/google.png',
  haylou: '/electro/img/brands/haylou.png',
  honor: '/electro/img/brands/honor.png',
  hp: '/electro/img/brands/hp.webp',
  huawei: '/electro/img/brands/huawei.png',
  ipad: '/electro/img/brands/ipad.png',
  iphone: '/electro/img/brands/iphone.png',
  lenovo: '/electro/img/brands/lenovo.webp',
  lg: '/electro/img/brands/lg.png',
  microsoft: '/electro/img/brands/microsoft.png',
  msi: '/electro/img/brands/msi.webp',
  nokia: '/electro/img/brands/nokia.png',
  oppo: '/electro/img/brands/oppo.png',
  realme: '/electro/img/brands/realme.png',
  samsung: '/electro/img/brands/samsung.png',
  vivo: '/electro/img/brands/vivo.png',
  xiaomi: '/electro/img/brands/xiaomi.png',
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function getCategoryName(categories, categoryId) {
  const selectedCategory = categories.find((category) => String(category.id) === String(categoryId))
  return selectedCategory?.name || 'Sản phẩm'
}

function findCategoryIdByKeyword(categories, keyword) {
  const normalizedKeyword = normalizeText(keyword)

  if (!normalizedKeyword) {
    return ''
  }

  const matchedCategory = categories.find((category) => {
    const normalizedCategoryName = normalizeText(category.name)
    return (
      normalizedCategoryName === normalizedKeyword ||
      normalizedCategoryName.includes(normalizedKeyword) ||
      normalizedKeyword.includes(normalizedCategoryName)
    )
  })

  return matchedCategory ? String(matchedCategory.id) : ''
}

function getManufacturerLogoDataUri(manufacturer) {
  const brandName = manufacturer || 'All'
  const normalizedBrand = normalizeText(brandName)
  const color = BRAND_COLORS[normalizedBrand] || '#d10024'
  const safeBrandName = brandName.length > 12 ? brandName.slice(0, 12) : brandName
  const fontSize = safeBrandName.length > 8 ? 18 : 23
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="140" height="78" viewBox="0 0 140 78">
      <rect width="140" height="78" rx="18" fill="#ffffff"/>
      <rect x="1" y="1" width="138" height="76" rx="17" fill="#ffffff" stroke="#eef1f6"/>
      <circle cx="70" cy="24" r="6" fill="${color}" opacity="0.16"/>
      <text x="70" y="50" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="900" fill="${color}">${safeBrandName}</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function getManufacturerLogoSrc(manufacturer) {
  const normalizedBrand = normalizeText(manufacturer)
  return BRAND_LOGOS[normalizedBrand] || getManufacturerLogoDataUri(manufacturer)
}

function handleManufacturerLogoError(event, manufacturer) {
  const imageElement = event.currentTarget

  if (imageElement.dataset.fallbackApplied === 'true') {
    return
  }

  imageElement.dataset.fallbackApplied = 'true'
  imageElement.src = getManufacturerLogoDataUri(manufacturer)
}

function getManufacturersFromProducts(items) {
  return Array.from(
    new Set(
      (Array.isArray(items) ? items : [])
        .map((product) => product?.manufacturer?.trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right))
}

export default function StorePage({ categories, route, onNavigate, onAddToCart, onBuyNow }) {
  const brandScrollerRef = useRef(null)
  const sortMenuRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [manufacturers, setManufacturers] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
  const defaultSalesDateRange = useMemo(getDefaultSalesDateRange, [])

  const currentPage = Math.max(1, Number(route.query.page || 1))
  const keyword = route.query.keyword || ''
  const categoryId = route.query.categoryId || ''
  const inferredCategoryId = categoryId ? '' : findCategoryIdByKeyword(categories, keyword)
  const effectiveCategoryId = categoryId || inferredCategoryId
  const effectiveKeyword = inferredCategoryId ? '' : keyword
  const manufacturer = route.query.manufacturer || ''
  const requestedSortBy = route.query.sortBy || 'recent'
  const sortBy = SORT_OPTIONS.some((option) => option.value === requestedSortBy)
    ? requestedSortBy
    : 'recent'
  const startDate = sortBy === 'bestSelling'
    ? route.query.startDate || defaultSalesDateRange.startDate
    : ''
  const endDate = sortBy === 'bestSelling'
    ? route.query.endDate || defaultSalesDateRange.endDate
    : ''
  const currentCategoryName = getCategoryName(categories, effectiveCategoryId)
  const [salesDateRange, setSalesDateRange] = useState({ startDate, endDate })
  const [salesDateError, setSalesDateError] = useState('')

  const selectedSortOption = useMemo(
    () => SORT_OPTIONS.find((option) => option.value === sortBy) || SORT_OPTIONS[0],
    [sortBy],
  )

  useEffect(() => {
    setSalesDateRange({ startDate, endDate })
    setSalesDateError('')
  }, [startDate, endDate])

  useEffect(() => {
    if (!isSortMenuOpen) {
      return undefined
    }

    function closeSortMenu(event) {
      if (sortMenuRef.current?.contains(event.target)) {
        return
      }

      setIsSortMenuOpen(false)
    }

    function closeSortMenuByEscape(event) {
      if (event.key === 'Escape') {
        setIsSortMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', closeSortMenu)
    document.addEventListener('keydown', closeSortMenuByEscape)

    return () => {
      document.removeEventListener('mousedown', closeSortMenu)
      document.removeEventListener('keydown', closeSortMenuByEscape)
    }
  }, [isSortMenuOpen])

  useEffect(() => {
    let cancelled = false

    async function loadManufacturers() {
      try {
        if (effectiveCategoryId) {
          const response = await api.getProducts({
            categoryId: effectiveCategoryId,
            page: 1,
            pageSize: 500,
          })

          if (!cancelled) {
            setManufacturers(getManufacturersFromProducts(response.items))
          }

          return
        }

        const response = await api.getManufacturers()
        if (!cancelled) {
          setManufacturers(Array.isArray(response) ? response : [])
        }
      } catch {
        if (!cancelled) {
          setManufacturers([])
        }
      }
    }

    loadManufacturers()

    return () => {
      cancelled = true
    }
  }, [effectiveCategoryId])

  useEffect(() => {
    let cancelled = false

    async function loadProducts() {
      setLoading(true)
      setError('')

      try {
        const response = await api.getProducts({
          keyword: effectiveKeyword,
          categoryId: effectiveCategoryId,
          manufacturer,
          sortBy,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page: currentPage,
          pageSize: 12,
        })

        if (cancelled) {
          return
        }

        setProducts(response.items || [])
        setTotalPages(response.totalPages || 1)
        setTotalCount(response.totalCount || 0)
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      cancelled = true
    }
  }, [currentPage, effectiveCategoryId, effectiveKeyword, manufacturer, sortBy, startDate, endDate])

  const goToStore = (nextQuery = {}) => {
    onNavigate(buildStorePath({
      keyword: inferredCategoryId ? '' : keyword,
      categoryId: effectiveCategoryId,
      manufacturer,
      sortBy,
      startDate,
      endDate,
      ...nextQuery,
      page: nextQuery.page || 1,
    }))
  }

  const selectSortOption = (nextSortBy) => {
    setIsSortMenuOpen(false)
    goToStore({
      sortBy: nextSortBy,
      startDate: nextSortBy === 'bestSelling' ? startDate || defaultSalesDateRange.startDate : '',
      endDate: nextSortBy === 'bestSelling' ? endDate || defaultSalesDateRange.endDate : '',
    })
  }

  const applySalesDateRange = (event) => {
    event.preventDefault()

    if (salesDateRange.startDate > salesDateRange.endDate) {
      setSalesDateError('Từ ngày không được lớn hơn đến ngày.')
      return
    }

    setSalesDateError('')
    goToStore({
      sortBy: 'bestSelling',
      startDate: salesDateRange.startDate,
      endDate: salesDateRange.endDate,
    })
  }

  const scrollBrands = (direction) => {
    const scroller = brandScrollerRef.current

    if (!scroller) {
      return
    }

    scroller.scrollBy({
      left: direction * Math.max(280, Math.floor(scroller.clientWidth * 0.72)),
      behavior: 'smooth',
    })
  }

  return (
    <>
      <div className="store-modern-breadcrumb">
        <div className="container">
          <button type="button" onClick={() => onNavigate('/')}>
            Trang chủ
          </button>
          <span>/</span>
          <strong>{currentCategoryName}</strong>
        </div>
      </div>

      <div className="section store-modern-page">
        <div className="container">
          <div className="store-filter-panel">
            <div className="store-filter-title">
              <div>
                <span>Bộ lọc</span>
                <h3>{currentCategoryName}</h3>
              </div>
              <small>{totalCount} sản phẩm</small>
            </div>

            <div className="store-brand-carousel">
              <button
                className="store-brand-arrow"
                type="button"
                aria-label="Hãng trước"
                onClick={() => scrollBrands(-1)}
              >
                <i className="fa fa-angle-left" />
              </button>

              <div className="store-brand-scroller" ref={brandScrollerRef}>
                <button
                  className={!manufacturer ? 'store-brand-card active' : 'store-brand-card'}
                  type="button"
                  onClick={() => goToStore({ manufacturer: '' })}
                >
                  <span className="store-brand-logo">
                    <img src={getManufacturerLogoDataUri('All')} alt="Tất cả hãng" />
                  </span>
                  <strong>Tất cả hãng</strong>
                </button>
                {manufacturers.map((item) => (
                  <button
                    className={manufacturer === item ? 'store-brand-card active' : 'store-brand-card'}
                    key={item}
                    type="button"
                  onClick={() => goToStore({ manufacturer: item })}
                >
                  <span className="store-brand-logo">
                      <img
                        src={getManufacturerLogoSrc(item)}
                        alt={item}
                        onError={(event) => handleManufacturerLogoError(event, item)}
                      />
                  </span>
                  <strong>{item}</strong>
                </button>
                ))}
              </div>

              <button
                className="store-brand-arrow"
                type="button"
                aria-label="Hãng tiếp theo"
                onClick={() => scrollBrands(1)}
              >
                <i className="fa fa-angle-right" />
              </button>
            </div>
          </div>

          <div className="store-filter-actions">
            <button
              className="store-filter-reset"
              type="button"
              onClick={() => goToStore({
                manufacturer: '',
                sortBy: 'recent',
                startDate: '',
                endDate: '',
              })}
            >
              <i className="fa fa-filter" />
              Bộ lọc
            </button>

            <div className="store-sort-dropdown" ref={sortMenuRef}>
              <button
                className="store-sort-selected"
                type="button"
                aria-expanded={isSortMenuOpen}
                aria-haspopup="listbox"
                onClick={() => setIsSortMenuOpen((current) => !current)}
              >
                <i className={`fa ${selectedSortOption.icon}`} />
                {selectedSortOption.label}
                <i className="fa fa-caret-down" />
              </button>

              {isSortMenuOpen && (
                <div className="store-sort-menu" role="listbox" aria-label="Sắp xếp sản phẩm">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      className={sortBy === option.value ? 'active' : ''}
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={sortBy === option.value}
                      onClick={() => selectSortOption(option.value)}
                    >
                      <span>
                        <i className={`fa ${option.icon}`} />
                        {option.label}
                      </span>
                      <i className={`fa ${sortBy === option.value ? 'fa-dot-circle-o' : 'fa-circle-o'}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {sortBy === 'bestSelling' && (
              <form className="store-sales-date-filter" onSubmit={applySalesDateRange}>
                <label>
                  <span>Từ ngày</span>
                  <input
                    type="date"
                    required
                    value={salesDateRange.startDate}
                    onChange={(event) => setSalesDateRange((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))}
                  />
                </label>
                <label>
                  <span>Đến ngày</span>
                  <input
                    type="date"
                    required
                    value={salesDateRange.endDate}
                    onChange={(event) => setSalesDateRange((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))}
                  />
                </label>
                <button type="submit">
                  <i className="fa fa-filter" />
                  Lọc
                </button>
                {salesDateError && <small>{salesDateError}</small>}
              </form>
            )}
          </div>

          <div id="store" className="store-products-full">
            {loading ? (
              <div className="empty-state">Đang tải dữ liệu sản phẩm...</div>
            ) : error ? (
              <div className="empty-state error-state">{error}</div>
            ) : products.length === 0 ? (
              <div className="empty-state">
                Không tìm thấy sản phẩm phù hợp bộ lọc hiện tại.
              </div>
            ) : (
              <div className="row">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onNavigate={onNavigate}
                    onAddToCart={onAddToCart}
                    onBuyNow={onBuyNow}
                  />
                ))}
              </div>
            )}

            <div className="store-filter clearfix">
              <ul className="store-pagination">
                <li className={currentPage === 1 ? 'disabled' : ''}>
                  <button
                    type="button"
                    onClick={() => goToStore({ page: currentPage - 1 })}
                  >
                    <i className="fa fa-angle-left" />
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <li className={page === currentPage ? 'active' : ''} key={page}>
                    <button
                      type="button"
                      onClick={() => goToStore({ page })}
                    >
                      {page}
                    </button>
                  </li>
                ))}
                <li className={currentPage === totalPages ? 'disabled' : ''}>
                  <button
                    type="button"
                    onClick={() => goToStore({ page: currentPage + 1 })}
                  >
                    <i className="fa fa-angle-right" />
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

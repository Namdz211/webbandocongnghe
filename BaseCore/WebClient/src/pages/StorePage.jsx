import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client.js'
import LinkButton from '../components/LinkButton.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { buildStorePath } from '../utils/routes.js'
import { getDisplayName } from '../utils/productFields.js'

const SORT_OPTIONS = [
  { value: 'recent', label: 'Gần đây nhất', icon: 'fa-clock-o' },
  { value: 'priceAsc', label: 'Giá bán tăng dần', icon: 'fa-sort-amount-asc' },
  { value: 'priceDesc', label: 'Giá bán giảm dần', icon: 'fa-sort-amount-desc' },
]

const BRAND_LOGOS = {
  apple: '/electro/img/branchs/apple.png',
  asus: '/electro/img/branchs/asus.webp',
  dell: '/electro/img/branchs/dell.webp',
  hp: '/electro/img/branchs/hp.webp',
  lenovo: '/electro/img/branchs/lenovo.webp',
  msi: '/electro/img/branchs/msi.webp',
}

const BRAND_COLORS = {
  apple: '#111827',
  asus: '#00539b',
  dell: '#0672cb',
  hp: '#0096d6',
  lenovo: '#e2231a',
  msi: '#d71920',
  samsung: '#1428a0',
  xiaomi: '#ff6900',
}

function normalizeBrand(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function getBrandLogoFallback(manufacturer) {
  const brandName = manufacturer || 'All'
  const normalizedBrand = normalizeBrand(brandName)
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

function getBrandLogoSrc(manufacturer) {
  return BRAND_LOGOS[normalizeBrand(manufacturer)] || getBrandLogoFallback(manufacturer)
}

function handleBrandLogoError(event, manufacturer) {
  if (event.currentTarget.dataset.fallbackApplied === 'true') {
    return
  }

  event.currentTarget.dataset.fallbackApplied = 'true'
  event.currentTarget.src = getBrandLogoFallback(manufacturer)
}

export default function StorePage({ categories, route, onNavigate, onAddToCart, onBuyNow }) {
  const brandScrollerRef = useRef(null)
  const sortMenuRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [manufacturers, setManufacturers] = useState([])
  const [priceFilter, setPriceFilter] = useState({ minPrice: '', maxPrice: '' })
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)

  const currentPage = Math.max(1, Number(route.query.page || 1))
  const keyword = route.query.keyword || ''
  const categoryId = route.query.categoryId || ''
  const manufacturer = route.query.manufacturer || ''
  const minPrice = route.query.minPrice || ''
  const maxPrice = route.query.maxPrice || ''
  const requestedSortBy = route.query.sortBy || 'recent'
  const sortBy = SORT_OPTIONS.some((option) => option.value === requestedSortBy)
    ? requestedSortBy
    : 'recent'
  const selectedSortOption = useMemo(
    () => SORT_OPTIONS.find((option) => option.value === sortBy) || SORT_OPTIONS[0],
    [sortBy],
  )

  useEffect(() => {
    setPriceFilter({ minPrice, maxPrice })
  }, [minPrice, maxPrice])

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
        const response = await api.getManufacturers()
        if (!cancelled) {
          setManufacturers(
            Array.isArray(response)
              ? response.map((item) => getDisplayName(item)).filter(Boolean)
              : [],
          )
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
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadProducts() {
      setLoading(true)
      setError('')

      try {
        const response = await api.getProducts({
          keyword,
          categoryId,
          manufacturer,
          minPrice,
          maxPrice,
          sortBy,
          page: currentPage,
          pageSize: 9,
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
  }, [categoryId, currentPage, keyword, manufacturer, minPrice, maxPrice, sortBy])

  function goToStore(nextQuery = {}) {
    onNavigate(buildStorePath({
      keyword,
      categoryId,
      manufacturer,
      minPrice,
      maxPrice,
      sortBy,
      ...nextQuery,
      page: nextQuery.page || 1,
    }))
  }

  function applyPriceFilter(event) {
    event.preventDefault()

    goToStore({
      minPrice: priceFilter.minPrice,
      maxPrice: priceFilter.maxPrice,
      page: 1,
    })
  }

  function selectSortOption(nextSortBy) {
    setIsSortMenuOpen(false)
    goToStore({ sortBy: nextSortBy })
  }

  function scrollBrands(direction) {
    if (!brandScrollerRef.current) {
      return
    }

    brandScrollerRef.current.scrollBy({
      left: direction * 260,
      behavior: 'smooth',
    })
  }

  return (
    <>
      <div id="breadcrumb" className="section">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <h3 className="breadcrumb-header">Cửa hàng</h3>
              <ul className="breadcrumb-tree">
                <li>
                  <LinkButton to="/" onNavigate={onNavigate}>
                    Trang chủ
                  </LinkButton>
                </li>
                <li className="active">Danh sách sản phẩm</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <div className="store-filter-panel">
            <div className="store-filter-title">
              <div>
                <span>Bộ lọc</span>
                <h3>{manufacturer || 'Tất cả hãng'}</h3>
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
                    <img src={getBrandLogoFallback('All')} alt="Tất cả hãng" />
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
                        src={getBrandLogoSrc(item)}
                        alt={item}
                        onError={(event) => handleBrandLogoError(event, item)}
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

            <div className="store-filter-actions">
              <button
                className="store-filter-reset"
                type="button"
                onClick={() => goToStore({ manufacturer: '', minPrice: '', maxPrice: '', sortBy: 'recent' })}
              >
                <i className="fa fa-filter" />
                Xóa lọc
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
            </div>
          </div>

          <div className="row">
            <div id="aside" className="col-md-3">
              <div className="aside">
                <h3 className="aside-title">Danh mục</h3>
                <div className="checkbox-filter category-filter-list">
                  <div className="input-checkbox">
                    <label className={!categoryId ? 'is-selected' : ''}>
                      <LinkButton
                        to={buildStorePath({ keyword, manufacturer, minPrice, maxPrice, sortBy })}
                        onNavigate={onNavigate}
                      >
                        Tất cả sản phẩm
                      </LinkButton>
                    </label>
                  </div>
                  {categories.map((category) => (
                    <div className="input-checkbox" key={category.id}>
                      <label
                        className={
                          categoryId === String(category.id) ? 'is-selected' : ''
                        }
                      >
                        <LinkButton
                          to={buildStorePath({
                            keyword,
                            categoryId: category.id,
                            manufacturer,
                            minPrice,
                            maxPrice,
                            sortBy,
                          })}
                          onNavigate={onNavigate}
                        >
                          {category.name}
                        </LinkButton>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="aside">
                <h3 className="aside-title">{'H\u00e3ng'}</h3>
                <div className="checkbox-filter category-filter-list manufacturer-filter-list">
                  <div className="input-checkbox">
                    <label className={!manufacturer ? 'is-selected' : ''}>
                      <LinkButton
                        to={buildStorePath({ keyword, categoryId, minPrice, maxPrice, sortBy })}
                        onNavigate={onNavigate}
                      >
                        {'T\u1ea5t c\u1ea3 h\u00e3ng'}
                      </LinkButton>
                    </label>
                  </div>
                  {manufacturers.map((item) => (
                    <div className="input-checkbox" key={item}>
                      <label className={manufacturer === item ? 'is-selected' : ''}>
                        <LinkButton
                          to={buildStorePath({
                            keyword,
                            categoryId,
                            manufacturer: item,
                            minPrice,
                            maxPrice,
                            sortBy,
                          })}
                          onNavigate={onNavigate}
                        >
                          {item}
                        </LinkButton>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="aside">
                <h3 className="aside-title">{'Kho\u1ea3ng gi\u00e1'}</h3>
                <form className="price-filter-form" onSubmit={applyPriceFilter}>
                  <input
                    className="input"
                    min="0"
                    placeholder={'Gi\u00e1 t\u1eeb'}
                    type="number"
                    value={priceFilter.minPrice}
                    onChange={(event) =>
                      setPriceFilter((current) => ({
                        ...current,
                        minPrice: event.target.value,
                      }))
                    }
                  />
                  <input
                    className="input"
                    min="0"
                    placeholder={'Gi\u00e1 \u0111\u1ebfn'}
                    type="number"
                    value={priceFilter.maxPrice}
                    onChange={(event) =>
                      setPriceFilter((current) => ({
                        ...current,
                        maxPrice: event.target.value,
                      }))
                    }
                  />
                  <button className="primary-btn filter-apply-btn" type="submit">
                    {'L\u1ecdc'}
                  </button>
                </form>
              </div>

              <div className="aside">
                <h3 className="aside-title">Thông tin bộ lọc</h3>
                <div className="category-filter-note">
                  <p>
                    Từ khóa: <strong>{keyword || 'Không có'}</strong>
                  </p>
                  <p>
                    <span>{'H\u00e3ng'}: </span><strong>{manufacturer || 'T\u1ea5t c\u1ea3'}</strong>
                  </p>
                  <p>
                    <span>{'Gi\u00e1'}: </span><strong>{minPrice || '0'} - {maxPrice || 'kh\u00f4ng gi\u1edbi h\u1ea1n'}</strong>
                  </p>
                  <p>
                    Tổng kết quả: <strong>{totalCount}</strong>
                  </p>
                  <LinkButton
                    className="filter-clear-link"
                    to={buildStorePath({ keyword })}
                    onNavigate={onNavigate}
                  >
                    {'X\u00f3a b\u1ed9 l\u1ecdc'}
                  </LinkButton>
                </div>
              </div>
            </div>

            <div id="store" className="col-md-9">
              <div className="store-filter clearfix">
                <div className="store-sort">
                  <label>
                    Trang hiện tại:
                    <span className="input-select inline-note">{currentPage}</span>
                  </label>
                </div>
                <div className="store-grid">
                  <span className="store-qty">{totalCount} sản phẩm</span>
                </div>
              </div>

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
                      onClick={() =>
                        onNavigate(
                          buildStorePath({
                            keyword,
                            categoryId,
                            manufacturer,
                            minPrice,
                            maxPrice,
                            sortBy,
                            page: currentPage - 1,
                          }),
                        )
                      }
                    >
                      <i className="fa fa-angle-left" />
                    </button>
                  </li>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                    (page) => (
                      <li
                        className={page === currentPage ? 'active' : ''}
                        key={page}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onNavigate(
                              buildStorePath({ keyword, categoryId, manufacturer, minPrice, maxPrice, sortBy, page }),
                            )
                          }
                        >
                          {page}
                        </button>
                      </li>
                    ),
                  )}
                  <li className={currentPage === totalPages ? 'disabled' : ''}>
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate(
                          buildStorePath({
                            keyword,
                            categoryId,
                            manufacturer,
                            minPrice,
                            maxPrice,
                            sortBy,
                            page: currentPage + 1,
                          }),
                        )
                      }
                    >
                      <i className="fa fa-angle-right" />
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

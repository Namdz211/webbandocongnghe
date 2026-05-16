import { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import LinkButton from '../components/LinkButton.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { buildStorePath } from '../utils/routes.js'
import { getDisplayName } from '../utils/productFields.js'

export default function StorePage({ categories, route, onNavigate, onAddToCart, onBuyNow }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [manufacturers, setManufacturers] = useState([])
  const [priceFilter, setPriceFilter] = useState({ minPrice: '', maxPrice: '' })
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const currentPage = Math.max(1, Number(route.query.page || 1))
  const keyword = route.query.keyword || ''
  const categoryId = route.query.categoryId || ''
  const manufacturer = route.query.manufacturer || ''
  const minPrice = route.query.minPrice || ''
  const maxPrice = route.query.maxPrice || ''

  useEffect(() => {
    setPriceFilter({ minPrice, maxPrice })
  }, [minPrice, maxPrice])

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
  }, [categoryId, currentPage, keyword, manufacturer, minPrice, maxPrice])

  function applyPriceFilter(event) {
    event.preventDefault()

    onNavigate(buildStorePath({
      keyword,
      categoryId,
      manufacturer,
      minPrice: priceFilter.minPrice,
      maxPrice: priceFilter.maxPrice,
      page: 1,
    }))
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
          <div className="row">
            <div id="aside" className="col-md-3">
              <div className="aside">
                <h3 className="aside-title">Danh mục</h3>
                <div className="checkbox-filter category-filter-list">
                  <div className="input-checkbox">
                    <label className={!categoryId ? 'is-selected' : ''}>
                      <LinkButton
                        to={buildStorePath({ keyword, manufacturer, minPrice, maxPrice })}
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
                        to={buildStorePath({ keyword, categoryId, minPrice, maxPrice })}
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
                              buildStorePath({ keyword, categoryId, manufacturer, minPrice, maxPrice, page }),
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

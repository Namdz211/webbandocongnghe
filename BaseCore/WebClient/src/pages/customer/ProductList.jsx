import { useEffect, useState } from 'react'
import LinkButton from '../../components/LinkButton'
import ProductCard from '../../components/ProductCard'
import { api } from '../../api'
import { buildStorePath } from '../../utils/storefront'

function ProductList({ categories, route, onNavigate, onAddToCart, onBuyNow }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const currentPage = Math.max(1, Number(route.query.page || 1))
  const keyword = route.query.keyword || ''
  const categoryId = route.query.categoryId || ''

  useEffect(() => {
    let cancelled = false

    async function loadProducts() {
      setLoading(true)
      setError('')

      try {
        const response = await api.getProducts({
          keyword,
          categoryId,
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
  }, [categoryId, currentPage, keyword])

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
                        to={buildStorePath({ keyword })}
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
                <h3 className="aside-title">Thông tin bộ lọc</h3>
                <div className="category-filter-note">
                  <p>
                    Từ khóa: <strong>{keyword || 'Không có'}</strong>
                  </p>
                  <p>
                    Tổng kết quả: <strong>{totalCount}</strong>
                  </p>
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
                              buildStorePath({ keyword, categoryId, page }),
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

export default ProductList

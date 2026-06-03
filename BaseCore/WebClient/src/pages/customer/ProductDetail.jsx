import { useEffect, useState } from 'react'
import LinkButton from '../../components/LinkButton'
import ProductCard from '../../components/ProductCard'
import { api } from '../../api'
import { formatCurrency, getProductImage, handleProductImageError, readStorage, STORAGE_KEYS, formatDate } from '../../utils/storefront'

function ProductDetail({ productId, onNavigate, onAddToCart, onBuyNow }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [quantity, setQuantity] = useState(1)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [canReview, setCanReview] = useState(false)

  const auth = readStorage(STORAGE_KEYS.auth, null)
  const token = auth?.token || auth?.Token || ''

  useEffect(() => {
    let cancelled = false

    async function loadProduct() {
      setLoading(true)
      setError('')
      setQuantity(1)

      try {
        const currentProduct = await api.getProduct(productId)

        if (cancelled) {
          return
        }

        setProduct(currentProduct)

        try {
          const reviewsData = await api.getReviews(currentProduct.id)
          if (!cancelled) setReviews(reviewsData || [])
        } catch (err) {
          console.error('Lỗi khi tải đánh giá:', err)
        }

        try {
          if (token) {
            const reviewEligibility = await api.canReview(currentProduct.id, token)
            if (!cancelled) setCanReview(reviewEligibility?.canReview || false)
          }
        } catch (err) {
          console.error('Lỗi khi kiểm tra quyền đánh giá:', err)
        }

        const relatedResponse = await api.getProducts({
          categoryId: currentProduct.categoryId,
          page: 1,
          pageSize: 4,
        })

        if (!cancelled) {
          setRelatedProducts(
            (relatedResponse.items || []).filter((item) => item.id !== currentProduct.id),
          )
        }
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

    loadProduct()

    return () => {
      cancelled = true
    }
  }, [productId])

  const submitReview = async (e) => {
    e.preventDefault()
    if (!token) return alert('Bạn cần đăng nhập để gửi đánh giá!')
    if (!comment.trim()) return alert('Vui lòng nhập nội dung đánh giá.')
    
    setSubmittingReview(true)
    try {
      await api.createReview({ productId: product.id, rating, comment }, token)
      // Refresh lại danh sách review sau khi submit thành công
      const newReviews = await api.getReviews(product.id)
      setReviews(newReviews || [])
      setComment('')
      setRating(5)
      alert('Cảm ơn bạn đã đánh giá sản phẩm!')
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra khi gửi đánh giá.')
    } finally {
      setSubmittingReview(false)
    }
  }

  const renderStars = (starCount) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <i key={index} className={`fa fa-star${index < starCount ? '' : '-o'}`} style={{ color: '#D10024' }} />
    ))
  }

  return (
    <>
      <div id="breadcrumb" className="section">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <h3 className="breadcrumb-header">Chi tiết sản phẩm</h3>
              <ul className="breadcrumb-tree">
                <li>
                  <LinkButton to="/" onNavigate={onNavigate}>
                    Trang chủ
                  </LinkButton>
                </li>
                <li>
                  <LinkButton to="/store" onNavigate={onNavigate}>
                    Cửa hàng
                  </LinkButton>
                </li>
                <li className="active">{product?.name || 'Đang tải'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          {loading ? (
            <div className="empty-state">Đang tải chi tiết sản phẩm...</div>
          ) : error || !product ? (
            <div className="empty-state error-state">{error || 'Không tìm thấy sản phẩm.'}</div>
          ) : (
            <>
              <div className="row">
                <div className="col-md-5 col-md-push-2">
                  <div id="product-main-img" className="product-preview">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      onError={(event) => handleProductImageError(event, product)}
                    />
                  </div>
                </div>

                <div className="col-md-2 col-md-pull-5">
                  <div id="product-imgs" className="product-preview-nav">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      onError={(event) => handleProductImageError(event, product)}
                    />
                    <img
                      src={FALLBACK_IMAGES[(Number(product.id) + 1) % FALLBACK_IMAGES.length]}
                      alt={`${product.name} gallery`}
                    />
                    <img
                      src={FALLBACK_IMAGES[(Number(product.id) + 2) % FALLBACK_IMAGES.length]}
                      alt={`${product.name} gallery`}
                    />
                  </div>
                </div>

                <div className="col-md-5">
                  <div className="product-details">
                    <h2 className="product-name">{product.name}</h2>
                    <div>
                      <div className="product-rating">
                        <i className="fa fa-star" />
                        <i className="fa fa-star" />
                        <i className="fa fa-star" />
                        <i className="fa fa-star" />
                        <i className="fa fa-star-o" />
                      </div>
                    </div>
                    <div>
                      <h3 className="product-price">{formatCurrency(product.price)}</h3>
                      <span className="product-available">
                        {product.stock > 0
                          ? `Còn ${product.stock} sản phẩm`
                          : 'Tạm hết hàng'}
                      </span>
                    </div>
                    <p>{product.description || 'Chưa có mô tả cho sản phẩm này.'}</p>

                    <div className="add-to-cart product-cart-panel">
                      <div className="qty-label">
                        Số lượng
                        <div className="input-number">
                          <input
                            type="number"
                            min="1"
                            max={Math.max(1, product.stock || 1)}
                            value={quantity}
                            onChange={(event) =>
                              setQuantity(
                                Math.max(
                                  1,
                                  Math.min(
                                    Number(event.target.value || 1),
                                    Math.max(1, product.stock || 1),
                                  ),
                                ),
                              )
                            }
                          />
                        </div>
                      </div>

                      <button
                        className="add-to-cart-btn"
                        type="button"
                        disabled={product.stock <= 0}
                        onClick={() => onAddToCart(product, quantity)}
                      >
                        <i className="fa fa-shopping-cart" /> Thêm vào giỏ
                      </button>
                      <button
                        className="buy-now-detail-btn"
                        type="button"
                        disabled={product.stock <= 0}
                        onClick={() => onBuyNow(product, quantity)}
                      >
                        Mua ngay
                      </button>
                    </div>

                    <ul className="product-links">
                      <li>Danh mục:</li>
                      <li>
                        <LinkButton
                          to={buildStorePath({ categoryId: product.categoryId })}
                          onNavigate={onNavigate}
                        >
                          {product.category?.name || 'Không xác định'}
                        </LinkButton>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="section">
                <div className="row">
                  <div className="col-md-12">
                    <h3 className="title" style={{ marginTop: '20px', borderBottom: '1px solid #E4E7ED', paddingBottom: '10px' }}>
                      Đánh giá sản phẩm ({reviews.length})
                    </h3>
                    
                    <div className="row">
                      <div className="col-md-6">
                        {reviews.length === 0 ? (
                          <p style={{ color: '#8D99AE' }}>Chưa có đánh giá nào cho sản phẩm này.</p>
                        ) : (
                          <ul className="reviews-list" style={{ listStyle: 'none', padding: 0 }}>
                            {reviews.map((rv) => (
                              <li key={rv.id} style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #E4E7ED' }}>
                                <div className="review-heading">
                                  <h5 style={{ display: 'inline-block', marginRight: '10px' }}>{rv.userName}</h5>
                                  <p className="date" style={{ display: 'inline-block', color: '#8D99AE', fontSize: '12px', marginRight: '10px' }}>
                                    {formatDate(rv.createdDate)}
                                  </p>
                                  <div className="review-rating" style={{ display: 'inline-block' }}>
                                    {renderStars(rv.rating)}
                                  </div>
                                </div>
                                <div className="review-body">
                                  <p>{rv.comment}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="col-md-6">
                        <h4 className="title">Viết đánh giá của bạn</h4>
                        {token && !canReview ? (
                          <div style={{ color: '#8D99AE', marginTop: '10px' }}>
                            Bạn chỉ có thể đánh giá sau khi đã mua và nhận hàng thành công sản phẩm này.
                          </div>
                        ) : (
                          <form className="review-form" onSubmit={submitReview}>
                            <textarea 
                              className="input" 
                              placeholder="Bạn nghĩ gì về sản phẩm này?" 
                              style={{ width: '100%', marginBottom: '15px' }}
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              disabled={!token || submittingReview}
                            />
                            <div className="input-rating" style={{ marginBottom: '15px' }}>
                              <span style={{ marginRight: '10px' }}>Chất lượng:</span>
                              <select className="input" style={{ width: 'auto', display: 'inline-block' }} value={rating} onChange={(e) => setRating(Number(e.target.value))} disabled={!token || submittingReview}>
                                <option value="5">5 Sao - Tuyệt vời</option>
                                <option value="4">4 Sao - Rất tốt</option>
                                <option value="3">3 Sao - Bình thường</option>
                                <option value="2">2 Sao - Kém</option>
                                <option value="1">1 Sao - Quá tệ</option>
                              </select>
                            </div>
                            <button className="primary-btn" type="submit" disabled={!token || submittingReview}>
                              {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                            </button>
                            {!token && <p style={{ color: '#D10024', marginTop: '10px' }}>Bạn cần đăng nhập để đánh giá.</p>}
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="section">
                <SectionHeader
                  title="Sản phẩm liên quan"
                  description="Lấy theo danh mục từ backend hiện tại"
                  onNavigate={onNavigate}
                />
                <div className="row">
                  {relatedProducts.length === 0 ? (
                    <div className="empty-state">Chưa có sản phẩm liên quan.</div>
                  ) : (
                    relatedProducts.map((item) => (
                      <ProductCard
                        key={item.id}
                        product={item}
                        onNavigate={onNavigate}
                        onAddToCart={onAddToCart}
                        onBuyNow={onBuyNow}
                      />
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default ProductDetail

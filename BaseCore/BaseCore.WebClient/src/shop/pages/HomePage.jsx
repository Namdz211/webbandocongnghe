import { useEffect, useState } from 'react'
import LinkButton from '../components/LinkButton.jsx'
import ProductCard from '../components/ProductCard.jsx'
import SectionHeader from '../components/SectionHeader.jsx'
import { formatCurrency } from '../utils/formatters.js'
import { getCouponCode } from '../utils/coupons.js'
import { getProductImage, handleProductImageError } from '../utils/productImages.js'

const productIntroThemes = [
  {
    accent: '#1b6f8f',
    accentDark: '#0e4b63',
    soft: '#e8f6fb',
  },
  {
    accent: '#2f7df0',
    accentDark: '#245fc0',
    soft: '#eef5ff',
  },
  {
    accent: '#e87422',
    accentDark: '#bc5017',
    soft: '#fff4eb',
  },
]

function getProductCategoryLabel(product) {
  return (
    product?.category?.name ||
    product?.categoryName ||
    product?.manufacturer ||
    'Sản phẩm nổi bật'
  )
}

function getCouponValue(coupon, camelKey, pascalKey) {
  return coupon?.[camelKey] ?? coupon?.[pascalKey]
}

function getCouponDiscountText(coupon) {
  const discountType = getCouponValue(coupon, 'discountType', 'DiscountType')
  const discountValue = Number(getCouponValue(coupon, 'discountValue', 'DiscountValue') || 0)

  if (discountType === 'percent') {
    return `Giảm ${discountValue}%`
  }

  return `Giảm ${formatCurrency(discountValue)}`
}

function getCouponMeta(coupon) {
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

function CouponShowcase({ coupons, loadError, savedCouponCodes, onSaveCoupon }) {
  const visibleCoupons = (Array.isArray(coupons) ? coupons : [])
    .filter((coupon) => Boolean(getCouponValue(coupon, 'code', 'Code')))
    .slice(0, 3)
  const savedCodeSet = new Set(Array.isArray(savedCouponCodes) ? savedCouponCodes : [])

  return (
    <div className="coupon-showcase" aria-label="Mã giảm giá đang áp dụng">
      <div className="coupon-showcase-title">
        <i className="fa fa-ticket" />
        <span>Mã giảm giá đang áp dụng</span>
      </div>

      <div className="coupon-showcase-list">
        {visibleCoupons.length === 0 && (
          <div className="coupon-empty">
            {loadError
              ? 'Mã giảm giá đang được cập nhật.'
              : 'Hiện chưa có mã giảm giá khả dụng.'}
          </div>
        )}

        {visibleCoupons.map((coupon) => {
          const code = getCouponValue(coupon, 'code', 'Code')
          const description = getCouponValue(coupon, 'description', 'Description')
          const meta = getCouponMeta(coupon)
          const normalizedCode = getCouponCode(coupon)
          const isSaved = savedCodeSet.has(normalizedCode)

          return (
            <div className="coupon-chip" key={getCouponValue(coupon, 'id', 'Id') || code}>
              <div className="coupon-chip-main">
                <strong>{code}</strong>
                <span>{getCouponDiscountText(coupon)}</span>
              </div>
              {description && <p>{description}</p>}
              {meta && <small>{meta}</small>}
              <button
                className="coupon-copy-btn"
                type="button"
                disabled={isSaved}
                onClick={() => onSaveCoupon?.(coupon)}
              >
                {isSaved ? 'Đã lưu' : 'Lưu'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProductIntroCarousel({ products, onNavigate }) {
  const slides = (Array.isArray(products) ? products : []).filter(Boolean).slice(0, 5)
  const slideCount = slides.length
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (slideCount <= 1) {
      return undefined
    }

    const slideTimer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount)
    }, 4500)

    return () => window.clearInterval(slideTimer)
  }, [slideCount])

  if (slideCount === 0) {
    return null
  }

  const safeActiveIndex = Math.min(activeIndex, slideCount - 1)

  const openProductDetail = (product) => {
    onNavigate(`/product/${product.id}`)
  }

  const handleSlideKeyDown = (event, product) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    openProductDetail(product)
  }

  const moveSlide = (direction) => {
    setActiveIndex((current) => {
      const nextIndex = current + direction

      if (nextIndex < 0) {
        return slideCount - 1
      }

      if (nextIndex >= slideCount) {
        return 0
      }

      return nextIndex
    })
  }

  return (
    <section className="product-intro-carousel" aria-label="Giới thiệu sản phẩm nổi bật">
      {slideCount > 1 && (
        <button
          className="product-intro-arrow product-intro-arrow-left"
          type="button"
          aria-label="Sản phẩm trước"
          onClick={() => moveSlide(-1)}
        >
          <i className="fa fa-arrow-left" />
        </button>
      )}

      <div className="product-intro-viewport">
        <div
          className="product-intro-track"
          style={{ transform: `translateX(-${safeActiveIndex * 100}%)` }}
        >
          {slides.map((product, index) => {
            const theme = productIntroThemes[index % productIntroThemes.length]
            const categoryLabel = getProductCategoryLabel(product)

            return (
              <article
                className="product-intro-slide product-intro-slide-clickable"
                key={product.id}
                role="button"
                tabIndex={0}
                aria-label={`Xem chi tiết ${product.name}`}
                onClick={() => openProductDetail(product)}
                onKeyDown={(event) => handleSlideKeyDown(event, product)}
                style={{
                  '--intro-accent': theme.accent,
                  '--intro-accent-dark': theme.accentDark,
                  '--intro-soft': theme.soft,
                }}
              >
                <div className="container product-intro-content">
                  <div className="product-intro-image">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      onError={(event) => handleProductImageError(event, product)}
                    />
                  </div>

                  <div className="product-intro-info">
                    <p className="product-intro-label">{categoryLabel}</p>
                    <h2>{product.name}</h2>
                    <div className="product-intro-price">
                      <span>Giá từ</span>
                      <strong>{formatCurrency(product.price)}</strong>
                    </div>
                    <div className="product-intro-offer">
                      <span>{product.manufacturer || categoryLabel}</span>
                      <small>
                        {product.stock > 0
                          ? `Còn ${product.stock} sản phẩm`
                          : 'Nhấn vào slide để xem chi tiết sản phẩm'}
                      </small>
                    </div>
                    <span className="product-intro-buy">Xem chi tiết</span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {slideCount > 1 && (
        <button
          className="product-intro-arrow product-intro-arrow-right"
          type="button"
          aria-label="Sản phẩm tiếp theo"
          onClick={() => moveSlide(1)}
        >
          <i className="fa fa-arrow-right" />
        </button>
      )}

      {slideCount > 1 && (
        <div className="product-intro-dots">
          {slides.map((product, index) => (
            <button
              className={index === safeActiveIndex ? 'active' : ''}
              key={product.id}
              type="button"
              aria-label={`Chuyển đến ${product.name}`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default function HomePage({
  coupons,
  couponLoadError,
  savedCouponCodes,
  highlightedProducts,
  topSellingProducts,
  onNavigate,
  onAddToCart,
  onBuyNow,
  onSaveCoupon,
}) {
  const featuredProducts = highlightedProducts.slice(0, 8)
  const visibleTopSellingProducts = (Array.isArray(topSellingProducts) ? topSellingProducts : []).slice(0, 4)

  return (
    <>
      <ProductIntroCarousel products={highlightedProducts} onNavigate={onNavigate} />

      <div className="section">
        <div className="container">
          <SectionHeader
            title="Sản phẩm mới cập nhật"
            linkTo="/store"
            onNavigate={onNavigate}
          />
          <CouponShowcase
            coupons={coupons}
            loadError={couponLoadError}
            savedCouponCodes={savedCouponCodes}
            onSaveCoupon={onSaveCoupon}
          />
          <div className="row">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onNavigate={onNavigate}
                onAddToCart={onAddToCart}
                onBuyNow={onBuyNow}
              />
            ))}
          </div>
        </div>
      </div>

      <div id="hot-deal" className="section">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="hot-deal">
                <ul className="hot-deal-countdown">
                  <li>
                    <div>
                      <h3>24</h3>
                      <span>Giờ</span>
                    </div>
                  </li>
                  <li>
                    <div>
                      <h3>60</h3>
                      <span>Phut</span>
                    </div>
                  </li>
                  <li>
                    <div>
                      <h3>60</h3>
                      <span>Giay</span>
                    </div>
                  </li>
                </ul>
                <h2 className="text-uppercase">hn mobile</h2>
                <p>Giá cả phải chăng - Giao hàng miễn phí</p>
                <LinkButton to="/checkout" className="primary-btn cta-btn" onNavigate={onNavigate}>
                  Đi đến thanh toán
                </LinkButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <SectionHeader
            title="Bán chạy"
            linkTo="/store"
            onNavigate={onNavigate}
          />
          <div className="row">
            {visibleTopSellingProducts.length === 0 && (
              <div className="col-md-12">
                <div className="empty-state compact">
                  Chưa có sản phẩm bán chạy từ đơn hàng đã hoàn thành.
                </div>
              </div>
            )}

            {visibleTopSellingProducts.map((product) => (
              <div className="col-md-3 col-sm-6 col-xs-6" key={product.id}>
                <div className="product-widget">
                  <div className="product-img">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      onError={(event) => handleProductImageError(event, product)}
                    />
                  </div>

                  <div className="product-body">
                    <p className="product-category">{product.category?.name || 'Sản phẩm'}</p>
                    <h3 className="product-name">
                      <LinkButton to={`/product/${product.id}`} onNavigate={onNavigate}>
                        {product.name}
                      </LinkButton>
                    </h3>
                    <h4 className="product-price">{formatCurrency(product.price)}</h4>
                    <small className="product-sold-note">
                      Đã bán {product.soldQuantity ?? product.SoldQuantity ?? 0}
                    </small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

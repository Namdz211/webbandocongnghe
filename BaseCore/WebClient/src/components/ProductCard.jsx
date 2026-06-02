import { formatCurrency } from '../utils/formatters.js'
import { getProductImage, handleProductImageError } from '../utils/productImages.js'
import { getCategoryName, getManufacturerName } from '../utils/productFields.js'

const RATING_STARS = [1, 2, 3, 4, 5]

function getProductRating(product) {
  return Number(product?.averageRating || product?.AverageRating || 0)
}

function getProductReviewCount(product) {
  return Number(product?.reviewCount || product?.ReviewCount || 0)
}

function renderRatingStars(rating) {
  return RATING_STARS.map((star) => {
    const iconClass = rating >= star
      ? 'fa-star'
      : rating >= star - 0.5
        ? 'fa-star-half-o'
        : 'fa-star-o'

    return <i className={`fa ${iconClass}`} key={star} />
  })
}

export default function ProductCard({ product, onNavigate }) {
  const productPath = `/product/${product.id}`
  const averageRating = getProductRating(product)
  const reviewCount = getProductReviewCount(product)
  const manufacturerName = getManufacturerName(product)

  function openProductDetail() {
    if (typeof onNavigate === 'function') {
      onNavigate(productPath)
    }
  }

  function handleProductKeyDown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    openProductDetail()
  }

  return (
    <div className="col-md-4 col-xs-6" key={product.id}>
      <div
        className="product product-card-clickable"
        role="button"
        tabIndex={0}
        aria-label={`Xem chi tiet ${product.name}`}
        onClick={openProductDetail}
        onKeyDown={handleProductKeyDown}
      >
        <div className="product-img">
          <img
            src={getProductImage(product)}
            alt={product.name}
            onError={(event) => handleProductImageError(event, product)}
          />
          <div className="product-label">
            {product.stock < 5 && <span className="sale">{'S\u1eafp h\u1ebft'}</span>}
            <span className="new">{'M\u1edbi'}</span>
          </div>
        </div>

        <div className="product-body">
          <p className="product-category">{getCategoryName(product, 'Sản phẩm')}</p>
          {manufacturerName && (
            <p className="product-manufacturer">{manufacturerName}</p>
          )}
          <h3 className="product-name">{product.name}</h3>
          <h4 className="product-price">{formatCurrency(product.price)}</h4>
          <div className="product-rating product-card-rating">
            {renderRatingStars(averageRating)}
            {reviewCount > 0 && (
              <span>{averageRating.toFixed(1)} ({reviewCount})</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

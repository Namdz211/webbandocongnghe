import { formatCurrency } from '../utils/formatters.js'
import { getProductImage, handleProductImageError } from '../utils/productImages.js'

export default function ProductCard({ product, onNavigate }) {
  const productPath = `/product/${product.id}`

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
          <p className="product-category">{product.category?.name || 'S\u1ea3n ph\u1ea9m'}</p>
          {product.manufacturer && (
            <p className="product-manufacturer">{product.manufacturer}</p>
          )}
          <h3 className="product-name">{product.name}</h3>
          <h4 className="product-price">{formatCurrency(product.price)}</h4>
          <div className="product-rating">
            <i className="fa fa-star" />
            <i className="fa fa-star" />
            <i className="fa fa-star" />
            <i className="fa fa-star" />
            <i className="fa fa-star-o" />
          </div>
        </div>
      </div>
    </div>
  )
}

import LinkButton from './LinkButton.jsx'
import { formatCurrency } from '../utils/formatters.js'
import { getProductImage, handleProductImageError } from '../utils/productImages.js'
import { getCategoryName, getManufacturerName } from '../utils/productFields.js'

export default function ProductCard({ product, onNavigate, onAddToCart, onBuyNow }) {
  const manufacturerName = getManufacturerName(product)

  return (
    <div className="col-md-4 col-xs-6" key={product.id}>
      <div className="product">
        <div className="product-img">
          <img
            src={getProductImage(product)}
            alt={product.name}
            onError={(event) => handleProductImageError(event, product)}
          />
          <div className="product-label">
            {product.stock < 5 && <span className="sale">Sắp hết</span>}
            <span className="new">Mới</span>
          </div>
        </div>
        <div className="product-body">
          <p className="product-category">{product.category?.name || 'Sản phẩm'}</p>
          {manufacturerName && (
            <p className="product-manufacturer">{manufacturerName}</p>
          )}
          <h3 className="product-name">
            <LinkButton to={`/product/${product.id}`} onNavigate={onNavigate}>
              {product.name}
            </LinkButton>
          </h3>
          <h4 className="product-price">{formatCurrency(product.price)}</h4>
          <div className="product-rating">
            <i className="fa fa-star" />
            <i className="fa fa-star" />
            <i className="fa fa-star" />
            <i className="fa fa-star" />
            <i className="fa fa-star-o" />
          </div>
          <div className="product-btns">
            <button
              className="add-to-wishlist"
              type="button"
              onClick={() => onNavigate(`/product/${product.id}`)}
            >
              <i className="fa fa-eye" />
              <span className="tooltipp">Xem chi tiết</span>
            </button>
            <button
              className="quick-view"
              type="button"
              onClick={() => onAddToCart(product, 1)}
            >
              <i className="fa fa-shopping-bag" />
              <span className="tooltipp">Thêm vào giỏ</span>
            </button>
          </div>
        </div>
        <div className="add-to-cart">
          <div className="product-action-row">
            <button className="add-to-cart-btn" type="button" onClick={() => onAddToCart(product, 1)}>
              <i className="fa fa-shopping-cart" /> Thêm vào giỏ
            </button>
            <button className="buy-now-btn" type="button" onClick={() => onBuyNow(product, 1)}>
              Mua ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

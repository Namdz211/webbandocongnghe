import LinkButton from '../components/LinkButton.jsx'
import ProductCard from '../components/ProductCard.jsx'
import HeroShops from '../components/HeroShops.jsx'
import SectionHeader from '../components/SectionHeader.jsx'
import { formatCurrency } from '../utils/formatters.js'
import { getProductImage, handleProductImageError } from '../utils/productImages.js'

export default function HomePage({
  categories,
  highlightedProducts,
  onNavigate,
  onAddToCart,
  onBuyNow,
}) {
  const featuredProducts = highlightedProducts.slice(0, 8)
  const topSellingProducts = highlightedProducts.slice(0, 4)

  return (
    <>
      <HeroShops categories={categories} onNavigate={onNavigate} />

      <div className="section">
        <div className="container">
          <SectionHeader
            title="Sản phẩm nổi bật"
            // description="Lấy dữ liệu trực tiếp từ FW API Gateway"
            linkTo="/store"
            onNavigate={onNavigate}
          />
          <div className="row product-row">
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
                <h2 className="text-uppercase">Giao diện Electro + backend FW</h2>
                <p>Storefront đã sẵn sàng cho luồng đặt hàng và tài khoản</p>
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
           // description="Những sản phẩm mới cập nhật trong hệ thống"
            linkTo="/store"
            onNavigate={onNavigate}
          />
          <div className="row">
            {topSellingProducts.map((product) => (
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

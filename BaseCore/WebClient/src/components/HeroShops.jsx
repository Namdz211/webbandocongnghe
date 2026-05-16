import { SHOP_IMAGES } from '../constants/images.js'
import LinkButton from './LinkButton.jsx'
import { buildStorePath } from '../utils/routes.js'

export default function HeroShops({ categories, onNavigate }) {
  const topCategories = categories.slice(0, 4)

  return (
    <div className="section">
      <div className="container">
        <div className="row">
          {topCategories.map((category, index) => (
            <div className="col-md-3 col-xs-6" key={category.id}>
              <div className="shop">
                <div className="shop-img">
                  <img src={SHOP_IMAGES[index % SHOP_IMAGES.length]} alt={category.name} />
                </div>
                <div className="shop-body">
                  <h3>
                    {category.name}
                    <br />
                    Collection
                  </h3>
                  <LinkButton
                    to={buildStorePath({ categoryId: category.id })}
                    className="cta-btn"
                    onNavigate={onNavigate}
                  >
                    Mua ngay <i className="fa fa-arrow-circle-right" />
                  </LinkButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

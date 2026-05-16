export default function Footer() {
  return (
    <footer id="footer">
      <div className="section">
        <div className="container">
          <div className="row">
            <div className="col-md-4 col-xs-6">
              <div className="footer">
                <h3 className="footer-title">Tổng đài liên hệ(08h00 - 22h00)</h3>
                {/* <p>
                  Storefront này được kết nối trực tiếp vào microservice gateway
                  của FW, sử dụng giao diện Electro cho phần mua hàng.
                </p> */}
                <ul className="footer-links">
                  <li>
                    <a href="https://www.google.com/maps/place/H%E1%BB%8Dc+vi%E1%BB%87n+K%E1%BB%B9+thu%E1%BA%ADt+Qu%C3%A2n+s%E1%BB%B1/@21.0467556,105.7838428,17z/data=!3m1!4b1!4m6!3m5!1s0x3135ab2d88bb4195:0x3006e474cce20274!8m2!3d21.0467556!4d105.7864177!16s%2Fm%2F03hl9kl?entry=ttu&g_ep=EgoyMDI2MDQyMC4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noreferrer">
                      <i className="fa fa-map-marker" /> Học viện Kỹ thuật Quân sự
                    </a>
                  </li>
                  <li>
                    <a href="tel:+84000000000">
                      <i className="fa fa-phone" /> 0975274355
                    </a>
                  </li>
                  {/* <li>
                    <a href="mailto:support@basecore.vn">
                      <i className="fa fa-envelope-o" /> support@basecore.vn
                    </a>
                  </li> */}
                </ul>
              </div>
            </div>

            <div className="col-md-2 col-xs-6">
              <div className="footer">
                <h3 className="footer-title">Về công ty</h3>
                <ul className="footer-links">
                  <li>
                    <a href="/store">Địa điểm: 236 Hoàng Quốc Việt, Cổ Nhuế, Nghĩa Đô, Hà Nội, Việt Nam </a>
                  </li>
                  <li>
                    <a href="/checkout">Thanh toán</a>
                  </li>
                  <li>
                    <a href="/orders">Theo dõi đơn</a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="clearfix visible-xs" />

            <div className="col-md-3 col-xs-6">
              <div className="footer">
                <h3 className="footer-title">Công nghệ</h3>
                <ul className="footer-links">
                  <li>
                    <span>React 19 + Vite</span>
                  </li>
                  <li>
                    <span>Gateway Ocelot</span>
                  </li>
                  <li>
                    <span>Auth JWT</span>
                  </li>
                  <li>
                    <span>Product + Order API</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-md-3 col-xs-6">
              <div className="footer">
                <h3 className="footer-title">Trạng thái</h3>
                <p className="footer-note">
                  Giao diện Electro đã được đưa vào `WebClient` để hoàn thiện
                  phần mua hàng và kết nối trực tiếp với Product + Order API.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

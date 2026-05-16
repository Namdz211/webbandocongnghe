function Footer() {
  return (
    <footer id="footer">
      <div className="section">
        <div className="container">
          <div className="row">
            <div className="col-md-4 col-xs-6">
              <div className="footer">
                <h3 className="footer-title">Tong dai lien he (08h00 - 22h00)</h3>
                <ul className="footer-links">
                  <li>
                    <a href="https://www.google.com/maps/place/H%E1%BB%8Dc+vi%E1%BB%87n+K%E1%BB%B9+thu%E1%BA%ADt+Qu%C3%A2n+s%E1%BB%B1/@21.0467556,105.7838428,17z/data=!3m1!4b1!4m6!3m5!1s0x3135ab2d88bb4195:0x3006e474cce20274!8m2!3d21.0467556!4d105.7864177!16s%2Fm%2F03hl9kl?entry=ttu&g_ep=EgoyMDI2MDQyMC4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noreferrer">
                      <i className="fa fa-map-marker" /> Hoc vien Ky thuat Quan su
                    </a>
                  </li>
                  <li>
                    <a href="tel:+840900000000">
                      <i className="fa fa-phone" /> 0900 000 000
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-md-2 col-xs-6">
              <div className="footer">
                <h3 className="footer-title">Ve cong ty</h3>
                <ul className="footer-links">
                  <li>
                    <a href="/store">Dia diem: 236 Hoang Quoc Viet, Co Nhue, Nghia Do, Ha Noi</a>
                  </li>
                  <li>
                    <a href="/checkout">Thanh toan</a>
                  </li>
                  <li>
                    <a href="/orders">Theo doi don</a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="clearfix visible-xs" />

            <div className="col-md-3 col-xs-6">
              <div className="footer">
                <h3 className="footer-title">Cong nghe</h3>
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
                <h3 className="footer-title">Trang thai</h3>
                <p className="footer-note">
                  Giao dien Electro da duoc dua vao WebClient de hoan thien phan mua hang.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

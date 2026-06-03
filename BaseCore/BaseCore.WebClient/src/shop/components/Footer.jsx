export default function Footer() {
  return (
    <footer id="footer">
      <div className="section">
        <div className="container">
          <div className="row footer-columns">
            <div className="col-md-4 col-sm-12 col-xs-12">
              <div className="footer">
                <h3 className="footer-title">Liên hệ với chúng tôi</h3>
                <ul className="footer-links">
                  <li>
                    <a href="tel:0975274355">
                      <i className="fa fa-phone" /> 0975274355
                    </a>
                  </li>
                  <li>
                    <a href="mailto:hnmobile@mta.vn">
                      <i className="fa fa-envelope-o" /> hnmobile@mta.vn
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-md-6 col-sm-12 col-xs-12">
              <div className="footer">
                <h3 className="footer-title">Về công ty</h3>
                <ul className="footer-links">
                  <li>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=236%20Ho%C3%A0ng%20Qu%E1%BB%91c%20Vi%E1%BB%87t%2C%20Ngh%C4%A9a%20%C4%90%C3%B4%2C%20H%C3%A0%20N%E1%BB%99i"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="fa fa-map-marker" /> Địa chỉ: 236 Hoàng Quốc Việt, Nghĩa Đô, Hà Nội
                    </a>
                  </li>
                  <li>
                    <span className="footer-link-text">
                      <i className="fa fa-clock-o" /> Thời gian làm việc: 08h00 - 22h00 từ thứ 2 đến Chủ nhật
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-md-2 col-sm-12 col-xs-12">
              <div className="footer">
                <h3 className="footer-title">Cam kết</h3>
                <ul className="footer-links">
                  <li>
                    <span className="footer-link-text">
                      <i className="fa fa-check-square-o" /> Được kiểm tra hàng trước
                    </span>
                  </li>
                  <li>
                    <span className="footer-link-text">
                      <i className="fa fa-refresh" /> Đổi trả trong vòng 7 ngày
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

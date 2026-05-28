import LinkButton from '../components/LinkButton.jsx'

export default function NotFoundPage({ onNavigate }) {
  return (
    <div className="section">
      <div className="container">
        <div className="empty-state">
          Trang bạn truy cập không tồn tại trong storefront này.
          <div className="empty-actions">
            <LinkButton to="/" className="primary-btn" onNavigate={onNavigate}>
              Về trang chủ
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  )
}

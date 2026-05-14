import AdminLinkButton from './AdminLinkButton'
import { getEmail, getName } from '../../utils/admin'

function AdminLayout({ auth, route, onNavigate, onLogout, children }) {
  const links = [
    { path: '/admin', label: 'Dashboard', icon: 'fa-dashboard' },
    { path: '/admin/orders', label: 'Orders', icon: 'fa-shopping-cart' },
    { path: '/admin/products', label: 'Products', icon: 'fa-archive' },
    { path: '/admin/categories', label: 'Categories', icon: 'fa-tags' },
    { path: '/admin/users', label: 'Users', icon: 'fa-users' },
  ]

  return (
    <div className="admin-wrapper">
      <nav className="admin-navbar">
        <div>
          <button className="admin-icon-btn" type="button" aria-label="Menu">
            <i className="fa fa-bars" />
          </button>
          <AdminLinkButton className="admin-top-link" to="/" onNavigate={onNavigate}>
            Shop
          </AdminLinkButton>
        </div>
        <div className="admin-user">
          <i className="fa fa-user-circle" />
          <span>{getName(auth)}</span>
          <button className="admin-logout" type="button" onClick={onLogout}>
            <i className="fa fa-sign-out" /> Logout
          </button>
        </div>
      </nav>

      <aside className="admin-sidebar">
        <AdminLinkButton className="admin-brand" to="/admin" onNavigate={onNavigate}>
          <strong>Store</strong> Sales
        </AdminLinkButton>
        <div className="admin-profile">
          <i className="fa fa-user-circle" />
          <div>
            <strong>{getName(auth)}</strong>
            <span>{getEmail(auth) || 'Administrator'}</span>
          </div>
        </div>
        <ul className="admin-menu">
          {links.map((link) => (
            <li key={link.path}>
              <AdminLinkButton
                className={route.pathname === link.path ? 'active' : ''}
                to={link.path}
                onNavigate={onNavigate}
              >
                <i className={`fa ${link.icon}`} />
                <span>{link.label}</span>
              </AdminLinkButton>
            </li>
          ))}
        </ul>
      </aside>

      <main className="admin-content">{children}</main>

      <footer className="admin-footer">
        <strong>Copyright 2024 BaseCore Sales.</strong>
        <span>Version 1.0.0</span>
      </footer>
    </div>
  )
}

export default AdminLayout

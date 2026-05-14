import { useMemo } from 'react'
import '../../styles/admin.css'
import '../../styles/admin-orders.css'
import AdminLayout from '../../components/admin/AdminLayout'
import RequireAdmin from '../../components/admin/RequireAdmin'
import AdminLogin from './Login'
import Categories from './Categories'
import Dashboard from './Dashboard'
import Orders from './Orders'
import Products from './Products'
import Users from './Users'

export default function AdminApp({
  auth,
  route,
  onNavigate,
  onLogin,
  onLogout,
  onDataChanged,
}) {
  const page = useMemo(() => {
    if (route.pathname === '/admin/login') {
      return 'login'
    }

    if (route.pathname === '/admin/products') {
      return 'products'
    }

    if (route.pathname === '/admin/orders') {
      return 'orders'
    }

    if (route.pathname === '/admin/categories') {
      return 'categories'
    }

    if (route.pathname === '/admin/users') {
      return 'users'
    }

    return 'dashboard'
  }, [route.pathname])

  if (page === 'login') {
    return <AdminLogin auth={auth} route={route} onNavigate={onNavigate} onLogin={onLogin} />
  }

  return (
    <RequireAdmin auth={auth} route={route} onNavigate={onNavigate} onLogin={onLogin}>
      <AdminLayout
        auth={auth}
        route={route}
        onNavigate={onNavigate}
        onLogout={() => {
          onLogout()
          onNavigate('/admin/login')
        }}
      >
        {page === 'dashboard' && <Dashboard auth={auth} />}
        {page === 'orders' && <Orders auth={auth} />}
        {page === 'products' && <Products auth={auth} onDataChanged={onDataChanged} />}
        {page === 'categories' && <Categories auth={auth} onDataChanged={onDataChanged} />}
        {page === 'users' && <Users auth={auth} />}
      </AdminLayout>
    </RequireAdmin>
  )
}

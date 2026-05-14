import AdminLogin from '../../pages/admin/Login'
import { isAdmin } from '../../utils/admin'

function RequireAdmin({ auth, route, onNavigate, onLogin, children }) {
  if (!auth || !isAdmin(auth)) {
    return (
      <AdminLogin
        auth={auth}
        route={{ query: { redirect: route.pathname } }}
        onNavigate={onNavigate}
        onLogin={onLogin}
      />
    )
  }

  return children
}

export default RequireAdmin

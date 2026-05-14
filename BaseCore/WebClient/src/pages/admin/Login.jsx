import { useEffect, useState } from 'react'
import AdminLinkButton from '../../components/admin/AdminLinkButton'
import { ADMIN_TOKEN_KEY, adminApi, isAdmin } from '../../utils/admin'

function AdminLogin({ auth, route, onNavigate, onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAdmin(auth)) {
      onNavigate(route.query.redirect || '/admin')
    }
  }, [auth, onNavigate, route.query.redirect])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await adminApi.login(username.trim(), password)
      localStorage.setItem(ADMIN_TOKEN_KEY, JSON.stringify(data))
      onLogin(data)
      onNavigate(route.query.redirect || '/admin')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-box">
        <div className="admin-login-logo">
          <AdminLinkButton to="/" onNavigate={onNavigate}>
            BaseCore Sales
          </AdminLinkButton>
        </div>
        <div className="admin-card admin-login-card">
          <p className="admin-login-message">Sign in to start your admin session</p>
          {error && <div className="admin-alert danger">{error}</div>}
          <form onSubmit={submit}>
            <div className="admin-input-group">
              <input
                autoFocus
                className="admin-control"
                placeholder="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
              <span className="fa fa-user" />
            </div>
            <div className="admin-input-group">
              <input
                className="admin-control"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <span className="fa fa-lock" />
            </div>
            <button className="admin-btn primary block" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin

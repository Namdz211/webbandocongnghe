import { useEffect, useState } from 'react'
import LinkButton from '../../components/LinkButton'

function Login({ auth, onNavigate, onLogin, onRegister, onLogout, onUpdateProfile, route }) {
  const [mode, setMode] = useState(route.query.mode === 'register' ? 'register' : 'login')
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
  })
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [profileError, setProfileError] = useState('')
  const isPasswordSection = route.query.section === 'password'

  useEffect(() => {
    setMode(route.query.mode === 'register' ? 'register' : 'login')
  }, [route.query.mode])

  useEffect(() => {
    if (!auth) {
      return
    }

    setProfileData({
      name: auth.name || auth.Name || '',
      email: auth.email || auth.Email || '',
      phone: auth.phone || auth.Phone || '',
    })
  }, [auth])

  const redirectPath = route.query.redirect || '/orders'

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const loggedInAuth =
        mode === 'register'
          ? await onRegister({
              username: formData.username.trim(),
              password: formData.password.trim(),
              name: formData.name.trim(),
              email: formData.email.trim(),
              phone: formData.phone.trim(),
            })
          : await onLogin(formData.username.trim(), formData.password.trim())

      onNavigate(isAdmin(loggedInAuth) ? '/admin' : redirectPath)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const submitProfile = async (event) => {
    event.preventDefault()
    setProfileSubmitting(true)
    setProfileError('')

    try {
      await onUpdateProfile({
        name: profileData.name.trim(),
        email: profileData.email.trim(),
        phone: profileData.phone.trim(),
      })
    } catch (requestError) {
      setProfileError(requestError.message)
    } finally {
      setProfileSubmitting(false)
    }
  }

  const submitPassword = async (event) => {
    event.preventDefault()
    setProfileSubmitting(true)
    setProfileError('')

    try {
      const password = passwordData.password.trim()
      const confirmPassword = passwordData.confirmPassword.trim()

      if (password.length < 6) {
        throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.')
      }

      if (password !== confirmPassword) {
        throw new Error('Xác nhận mật khẩu không khớp.')
      }

      await onUpdateProfile({ password })
      setPasswordData({ password: '', confirmPassword: '' })
    } catch (requestError) {
      setProfileError(requestError.message)
    } finally {
      setProfileSubmitting(false)
    }
  }

  if (auth) {
    return (
      <>
        <div id="breadcrumb" className="section account-breadcrumb">
          <div className="container">
            <div className="row">
              <div className="col-md-12">
                <h3 className="breadcrumb-header">Thông tin cá nhân</h3>
                <ul className="breadcrumb-tree">
                  <li>
                    <LinkButton to="/" onNavigate={onNavigate}>
                      Trang chủ
                    </LinkButton>
                  </li>
                  <li className="active">Thông tin cá nhân</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="container">
            <div className="profile-panel">
              <div className="profile-title">
                <i className="fa fa-id-card" />
                <span>{isPasswordSection ? 'Đổi mật khẩu' : 'Thông tin cá nhân'}</span>
              </div>

              <form className="profile-form" onSubmit={isPasswordSection ? submitPassword : submitProfile}>
                {profileError && <div className="error-banner">{profileError}</div>}

                {isPasswordSection ? (
                  <>
                    <div className="profile-row">
                      <label>Tên đăng nhập</label>
                      <input
                        className="input profile-input"
                        value={auth.username || auth.Username || ''}
                        disabled
                      />
                    </div>

                    <div className="profile-row">
                      <label>Mật khẩu mới</label>
                      <input
                        className="input profile-input"
                        placeholder="Nhập mật khẩu mới"
                        type="password"
                        value={passwordData.password}
                        onChange={(event) =>
                          setPasswordData((current) => ({
                            ...current,
                            password: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="profile-row">
                      <label>Xác nhận mật khẩu</label>
                      <input
                        className="input profile-input"
                        placeholder="Nhập lại mật khẩu mới"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(event) =>
                          setPasswordData((current) => ({
                            ...current,
                            confirmPassword: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="profile-row profile-avatar-row">
                      <label>Ảnh đại diện</label>
                      <div className="profile-avatar-block">
                        <div className="profile-avatar">
                          {(auth.name || auth.Name || auth.username || auth.Username || 'U').charAt(0).toUpperCase()}
                          <button className="profile-avatar-edit" type="button" aria-label="Đổi ảnh đại diện">
                            <i className="fa fa-pencil" />
                          </button>
                        </div>
                        <span>Tải file có định dạng: png, jpg, jpeg.</span>
                      </div>
                    </div>

                    <div className="profile-row">
                      <label>Tên đăng nhập</label>
                      <input
                        className="input profile-input"
                        value={auth.username || auth.Username || ''}
                        disabled
                      />
                    </div>

                    <div className="profile-row">
                      <label>Họ và tên</label>
                      <input
                        className="input profile-input"
                        placeholder="Họ và tên"
                        value={profileData.name}
                        onChange={(event) =>
                          setProfileData((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="profile-row">
                      <label>Email</label>
                      <input
                        className="input profile-input"
                        placeholder="Email"
                        type="email"
                        value={profileData.email}
                        onChange={(event) =>
                          setProfileData((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="profile-row">
                      <label>Số điện thoại</label>
                      <input
                        className="input profile-input"
                        placeholder="Số điện thoại"
                        value={profileData.phone}
                        onChange={(event) =>
                          setProfileData((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                )}

                <div className="profile-actions">
                  <button className="primary-btn" type="submit" disabled={profileSubmitting}>
                    {profileSubmitting
                      ? 'Đang cập nhật...'
                      : isPasswordSection
                        ? 'Đổi mật khẩu'
                        : 'Cập nhật'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div id="breadcrumb" className="section">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <h3 className="breadcrumb-header">
                {mode === 'register' ? 'Đăng ký tài khoản' : 'Đăng nhập'}
              </h3>
              <ul className="breadcrumb-tree">
                <li>
                  <LinkButton to="/" onNavigate={onNavigate}>
                    Trang chủ
                  </LinkButton>
                </li>
                <li className="active">
                  {mode === 'register' ? 'Đăng ký' : 'Đăng nhập'}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <div className="auth-layout">
            <div className="auth-card">
              <div className="auth-tabs">
                <button
                  className={mode === 'login' ? 'active' : ''}
                  type="button"
                  onClick={() => setMode('login')}
                >
                  Đăng nhập
                </button>
                <button
                  className={mode === 'register' ? 'active' : ''}
                  type="button"
                  onClick={() => setMode('register')}
                >
                  Đăng ký
                </button>
              </div>

              <form className="auth-form" onSubmit={submit}>
                {error && <div className="error-banner">{error}</div>}

                {mode === 'register' && (
                  <>
                    <input
                      className="input"
                      placeholder="Họ tên"
                      value={formData.name}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                    <input
                      className="input"
                      placeholder="Email"
                      type="email"
                      value={formData.email}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                    <input
                      className="input"
                      placeholder="Số điện thoại"
                      value={formData.phone}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </>
                )}

                <input
                  className="input"
                  placeholder="Tên đăng nhập"
                  value={formData.username}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                  required
                />
                <input
                  className="input"
                  placeholder="Mật khẩu"
                  type="password"
                  value={formData.password}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  required
                />

                <button className="primary-btn auth-submit" type="submit" disabled={submitting}>
                  {submitting
                    ? 'Đang xử lý...'
                    : mode === 'register'
                      ? 'Tạo tài khoản'
                      : 'Đăng nhập'}
                </button>
              </form>
            </div>

            <div className="auth-side-note">
              <h4>Tích hợp FW</h4>
              <p>
                Đăng nhập dùng endpoint `/api/auth/login`, đăng ký dùng
                `/api/auth/register`, và sau khi đăng nhập token sẽ được dùng cho
                `/api/orders`.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Login

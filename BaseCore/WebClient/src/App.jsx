import {
  startTransition,
  useEffect,
  useRef,
  useState,
} from 'react'
import AdminApp from './admin/AdminApp.jsx'
import { api } from './api/client.js'
import { ORDER_REFRESH_INTERVAL_MS } from './constants/orders.js'
import { STORAGE_KEYS } from './constants/storage.js'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import HomePage from './pages/HomePage.jsx'
import StorePage from './pages/StorePage.jsx'
import ProductPage from './pages/ProductPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'
import ProductAdminPage from './pages/ProductAdminPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import { getAuthToken, getAuthUserId, isExpiredToken } from './utils/auth.js'
import { formatCurrency } from './utils/formatters.js'
import { countActiveOrders } from './utils/orders.js'
import { parseRoute } from './utils/routes.js'
import { readStorage, writeStorage } from './utils/storage.js'

function App() {
  const [route, setRoute] = useState(parseRoute)
  const [auth, setAuth] = useState(() => readStorage(STORAGE_KEYS.auth, null))
  const [cart, setCart] = useState(() => readStorage(STORAGE_KEYS.cart, []))
  const [categories, setCategories] = useState([])
  const [highlightedProducts, setHighlightedProducts] = useState([])
  const [loadingHomeData, setLoadingHomeData] = useState(true)
  const [notice, setNotice] = useState(null)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [orderBadgeCount, setOrderBadgeCount] = useState(0)
  const [orderBadgeRefreshKey, setOrderBadgeRefreshKey] = useState(0)
  const noticeTimeoutRef = useRef(null)
  const authToken = getAuthToken(auth)

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cart, cart)
  }, [cart])

  useEffect(() => {
    if (auth) {
      writeStorage(STORAGE_KEYS.auth, auth)
    } else {
      localStorage.removeItem(STORAGE_KEYS.auth)
    }
  }, [auth])

  useEffect(() => {
    if (!authToken || isExpiredToken(authToken)) {
      setOrderBadgeCount(0)
      return undefined
    }

    let cancelled = false

    async function loadOrderBadgeCount() {
      try {
        const response = await api.getOrders(authToken)
        if (!cancelled) {
          setOrderBadgeCount(countActiveOrders(Array.isArray(response) ? response : []))
        }
      } catch {
        if (!cancelled) {
          setOrderBadgeCount(0)
        }
      }
    }

    loadOrderBadgeCount()
    const refreshInterval = window.setInterval(loadOrderBadgeCount, ORDER_REFRESH_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(refreshInterval)
    }
  }, [authToken, orderBadgeRefreshKey])

  useEffect(() => {
    const syncRoute = () => {
      startTransition(() => setRoute(parseRoute()))
    }

    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  function openNotice(type, message) {
    setNotice({ type, message })
    window.clearTimeout(noticeTimeoutRef.current)
    noticeTimeoutRef.current = window.setTimeout(() => setNotice(null), 3200)
  }

  useEffect(() => {
    return () => window.clearTimeout(noticeTimeoutRef.current)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadShellData() {
      setLoadingHomeData(true)

      try {
        const [categoryData, productData] = await Promise.all([
          api.getCategories(),
          api.getProducts({ page: 1, pageSize: 12 }),
        ])

        if (cancelled) {
          return
        }

        setCategories(Array.isArray(categoryData) ? categoryData : [])
        setHighlightedProducts(productData.items || [])
      } catch {
        if (!cancelled) {
          setCategories([])
          setHighlightedProducts([])
        }
      } finally {
        if (!cancelled) {
          setLoadingHomeData(false)
        }
      }
    }

    loadShellData()

    return () => {
      cancelled = true
    }
  }, [])

  async function refreshShellData() {
    try {
      const [categoryData, productData] = await Promise.all([
        api.getCategories(),
        api.getProducts({ page: 1, pageSize: 12 }),
      ])

      setCategories(Array.isArray(categoryData) ? categoryData : [])
      setHighlightedProducts(productData.items || [])
    } catch (requestError) {
      openNotice('error', requestError.message)
    }
  }

  function navigate(path) {
    if (`${window.location.pathname}${window.location.search}` === path) {
      return
    }

    window.history.pushState({}, '', path)

    const currentPathname = window.location.pathname
    const targetPathname = new URL(path, window.location.origin).pathname
    if (currentPathname !== targetPathname) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    startTransition(() => setRoute(parseRoute()))
  }

  function upsertCart(product, quantity) {
    if (!product) {
      return
    }

    const safeQuantity = Math.max(1, Number(quantity || 1))
    const cartKey = product.cartKey || String(product.id)

    setCart((current) => {
      const existing = current.find((item) => (item.cartKey || String(item.id)) === cartKey)
      if (existing) {
        return current.map((item) =>
          (item.cartKey || String(item.id)) === cartKey
            ? {
                ...item,
                quantity: Math.min(
                  item.quantity + safeQuantity,
                  Math.max(1, product.stock || item.quantity + safeQuantity),
                ),
              }
            : item,
        )
      }

      return [
        ...current,
        {
          cartKey,
          id: product.id,
          name: product.name,
          manufacturer: product.manufacturer || '',
          price: product.price,
          basePrice: product.basePrice ?? product.price,
          quantity: Math.min(safeQuantity, Math.max(1, product.stock || safeQuantity)),
          imageUrl: product.imageUrl,
          stock: product.stock,
          categoryId: product.categoryId,
          selectedSpecifications: product.selectedSpecifications || [],
          selectedSpecSummary: product.selectedSpecSummary || '',
        },
      ]
    })

    openNotice(
      'success',
      `Đã thêm "${product.name}${product.selectedSpecSummary ? ` (${product.selectedSpecSummary})` : ''}" vào giỏ hàng.`,
    )
  }

  function buyNow(product, quantity) {
    upsertCart(product, quantity)
    navigate('/checkout')
  }

  function removeCartItem(cartKey) {
    setCart((current) => current.filter((item) => (item.cartKey || String(item.id)) !== String(cartKey)))
    openNotice('success', 'Đã xóa sản phẩm khỏi giỏ hàng.')
  }

  async function login(username, password) {
    const data = await api.login(username, password)
    setAuth(data)
    openNotice('success', 'Đăng nhập thành công.')
    return data
  }

  async function register(payload) {
    const normalizedPayload = {
      username: payload.username.trim(),
      password: payload.password.trim(),
      name: payload.name?.trim() || '',
      email: payload.email?.trim() || '',
      phone: payload.phone?.trim() || '',
    }

    await api.register(normalizedPayload)
    const data = await login(normalizedPayload.username, normalizedPayload.password)
    openNotice('success', 'Tạo tài khoản thành công.')
    return data
  }

  async function updateProfile(payload) {
    const authToken = getAuthToken(auth)
    const userId = getAuthUserId(auth)

    if (!authToken || !userId) {
      throw new Error('Không tìm thấy phiên đăng nhập. Hãy đăng nhập lại.')
    }

    const updatedUser = await api.updateUser(userId, payload, authToken)
    setAuth((current) => ({
      ...current,
      name: updatedUser.name || updatedUser.Name || payload.name || current?.name || current?.Name,
      Name: updatedUser.name || updatedUser.Name || payload.name || current?.Name || current?.name,
      email: updatedUser.email || updatedUser.Email || payload.email || current?.email || current?.Email,
      Email: updatedUser.email || updatedUser.Email || payload.email || current?.Email || current?.email,
      phone: updatedUser.phone || updatedUser.Phone || payload.phone || current?.phone || current?.Phone,
      Phone: updatedUser.phone || updatedUser.Phone || payload.phone || current?.Phone || current?.phone,
    }))
    openNotice('success', payload.password ? 'Đã đổi mật khẩu.' : 'Đã cập nhật thông tin tài khoản.')
  }

  function logout() {
    setAuth(null)
    openNotice('success', 'Đã đăng xuất tài khoản.')
  }

  async function placeOrder(shippingInfo, paymentMethod) {
    const authToken = getAuthToken(auth)
    const activeAuthToken = authToken && !isExpiredToken(authToken) ? authToken : ''
    const customerName = shippingInfo?.customerName?.trim() || ''
    const customerEmail = shippingInfo?.customerEmail?.trim() || ''
    const customerPhone = shippingInfo?.customerPhone?.trim() || ''
    const shippingAddress = shippingInfo?.shippingAddress?.trim() || ''

    if (authToken && !activeAuthToken) {
      setAuth(null)
    }

    if (!customerName) {
      openNotice('error', 'Vui lòng nhập tên người nhận.')
      return
    }

    if (!customerPhone) {
      openNotice('error', 'Vui lòng nhập số điện thoại người nhận.')
      return
    }

    if (!shippingAddress) {
      openNotice('error', 'Vui lòng nhập địa chỉ giao hàng.')
      return
    }

    setPlacingOrder(true)

    try {
      const productChecks = await Promise.allSettled(
        cart.map((item) => api.getProduct(item.id)),
      )
      const invalidItems = cart.filter((item, index) => {
        const result = productChecks[index]

        if (result.status !== 'fulfilled') {
          return true
        }

        const latestProduct = result.value
        return (
          !latestProduct ||
          latestProduct.name !== item.name ||
          latestProduct.stock < item.quantity
        )
      })

      if (invalidItems.length > 0) {
        const invalidKeys = new Set(invalidItems.map((item) => item.cartKey || String(item.id)))

        setCart((current) =>
          current.filter((item) => !invalidKeys.has(item.cartKey || String(item.id))),
        )
        openNotice(
          'error',
          'Giỏ hàng có sản phẩm đã thay đổi hoặc không đủ tồn kho. Tôi đã xóa sản phẩm lỗi, vui lòng kiểm tra lại giỏ hàng.',
        )
        return
      }

      const payload = {
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        paymentMethod,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
      }

      const createdOrder = await api.createOrder(payload, activeAuthToken)
      setCart([])
      openNotice('success', createdOrder?.message || '\u0110\u1eb7t h\u00e0ng th\u00e0nh c\u00f4ng.')
      if (activeAuthToken) {
        setOrderBadgeRefreshKey((current) => current + 1)
        navigate('/orders')
      } else {
        navigate('/store')
      }
    } catch (requestError) {
      openNotice('error', requestError.message)
    } finally {
      setPlacingOrder(false)
    }
  }

  const cartSummary = {
    count: cart.reduce((sum, item) => sum + item.quantity, 0),
    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
  }

  if (route.name.startsWith('admin')) {
    return (
      <AdminApp
        auth={auth}
        route={route}
        onNavigate={navigate}
        onLogin={(adminAuth) => {
          setAuth(adminAuth)
        }}
        onLogout={logout}
        onDataChanged={refreshShellData}
      />
    )
  }

  let content = null
  const authRequiredRoutes = new Set(['orders', 'account'])
  const needsAuthFirst = !auth && authRequiredRoutes.has(route.name)

  if (needsAuthFirst) {
    content = (
      <AuthPage
        auth={auth}
        onNavigate={navigate}
        onLogin={login}
        onRegister={register}
        onLogout={logout}
        onUpdateProfile={updateProfile}
        route={{
          ...route,
          name: 'login',
          pathname: '/login',
          query: {
            redirect: `${route.pathname}${window.location.search}`,
          },
        }}
      />
    )
  } else if (loadingHomeData && (route.name === 'home' || route.name === 'store')) {
    content = (
      <div className="section">
        <div className="container">
          <div className="empty-state">Đang đồng bộ dữ liệu từ hệ thống FW...</div>
        </div>
      </div>
    )
  } else {
    switch (route.name) {
      case 'home':
        content = (
          <HomePage
            categories={categories}
            highlightedProducts={highlightedProducts}
            onNavigate={navigate}
            onAddToCart={upsertCart}
            onBuyNow={buyNow}
          />
        )
        break
      case 'store':
        content = (
          <StorePage
            categories={categories}
            route={route}
            onNavigate={navigate}
            onAddToCart={upsertCart}
            onBuyNow={buyNow}
          />
        )
        break
      case 'product':
        content = (
          <ProductPage
            productId={route.params.id}
            categories={categories}
            onNavigate={navigate}
            onAddToCart={upsertCart}
            onBuyNow={buyNow}
          />
        )
        break
      case 'checkout':
        content = (
          <CheckoutPage
            auth={auth}
            cart={cart}
            onNavigate={navigate}
            onPlaceOrder={placeOrder}
            submitting={placingOrder}
          />
        )
        break
      case 'orders':
        content = (
          <OrdersPage
            auth={auth}
            onNavigate={navigate}
            onNotify={openNotice}
            onOrdersChanged={() => setOrderBadgeRefreshKey((current) => current + 1)}
          />
        )
        break
      case 'adminProducts':
        content = (
          <ProductAdminPage
            auth={auth}
            categories={categories}
            onNavigate={navigate}
            onNotify={openNotice}
            onAdminProductsChanged={refreshShellData}
          />
        )
        break
      case 'login':
        content = (
          <AuthPage
            auth={auth}
            onNavigate={navigate}
            onLogin={login}
            onRegister={register}
            onLogout={logout}
            onUpdateProfile={updateProfile}
            route={route}
          />
        )
        break
      case 'account':
        content = (
          <AuthPage
            auth={auth}
            onNavigate={navigate}
            onLogin={login}
            onRegister={register}
            onLogout={logout}
            onUpdateProfile={updateProfile}
            route={route}
          />
        )
        break
      default:
        content = <NotFoundPage onNavigate={navigate} />
    }
  }

  return (
    <div className="app-shell">
      <Header
        key={`${route.pathname}?keyword=${route.query.keyword || ''}&categoryId=${route.query.categoryId || ''}&manufacturer=${route.query.manufacturer || ''}&minPrice=${route.query.minPrice || ''}&maxPrice=${route.query.maxPrice || ''}`}
        auth={auth}
        cart={cart}
        categories={categories}
        orderBadgeCount={orderBadgeCount}
        route={route}
        onNavigate={navigate}
        onLogout={logout}
        onRemoveCartItem={removeCartItem}
      />

      {notice && (
        <div className={`status-banner ${notice.type}`}>
          <div className="container">{notice.message}</div>
        </div>
      )}

      {content}

      <Footer />

      <button
        className="floating-cart"
        type="button"
        onClick={() => navigate('/checkout')}
      >
        <i className="fa fa-shopping-cart" />
        <span>{cartSummary.count}</span>
        <strong>{formatCurrency(cartSummary.total)}</strong>
      </button>
    </div>
  )
}

export default App

import {
  startTransition,
  useEffect,
  useRef,
  useState,
} from 'react'
import { api } from './api'
import {
  getAuthToken,
  getAuthUserId,
  isExpiredToken,
  parseRoute,
  readStorage,
  STORAGE_KEYS,
  writeStorage,
  formatCurrency,
} from './utils/storefront'
import {
  AuthPage,
  CheckoutPage,
  Footer,
  Header,
  HomePage,
  NotFoundPage,
  OrdersPage,
  ProductPage,
  StorePage,
} from './pages/customer/CustomerPages.jsx'

function App() {
  const [route, setRoute] = useState(parseRoute)
  const [auth, setAuth] = useState(null)
  const [cart, setCart] = useState(() => readStorage(STORAGE_KEYS.cart, []))
  const [categories, setCategories] = useState([])
  const [highlightedProducts, setHighlightedProducts] = useState([])
  const [orderCount, setOrderCount] = useState(0)
  const [loadingHomeData, setLoadingHomeData] = useState(true)
  const [notice, setNotice] = useState(null)
  const [placingOrder, setPlacingOrder] = useState(false)
  const noticeTimeoutRef = useRef(null)

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
    const authToken = getAuthToken(auth)

    if (!authToken || isExpiredToken(authToken)) {
      setOrderCount(0)
      return
    }

    let cancelled = false

    async function loadOrderCount() {
      try {
        const response = await api.getOrders(authToken)

        if (!cancelled) {
          setOrderCount(Array.isArray(response) ? response.length : 0)
        }
      } catch {
        if (!cancelled) {
          setOrderCount(0)
        }
      }
    }

    loadOrderCount()

    return () => {
      cancelled = true
    }
  }, [auth])

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
    const safeQuantity = Math.max(1, Number(quantity || 1))

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        return current.map((item) =>
          item.id === product.id
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
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: Math.min(safeQuantity, Math.max(1, product.stock || safeQuantity)),
          imageUrl: product.imageUrl,
          stock: product.stock,
          categoryId: product.categoryId,
        },
      ]
    })

    openNotice('success', `Đã thêm "${product.name}" vào giỏ hàng.`)
  }

  function buyNow(product, quantity) {
    upsertCart(product, quantity)
    navigate('/checkout')
  }

  function removeCartItem(productId) {
    setCart((current) => current.filter((item) => item.id !== productId))
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

  async function placeOrder(shippingAddress, paymentMethod) {
    const authToken = getAuthToken(auth)

    if (!authToken) {
      navigate('/login?redirect=/checkout')
      return
    }

    if (isExpiredToken(authToken)) {
      openNotice('error', 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại trước khi đặt hàng.')
      navigate('/login?redirect=/checkout')
      return
    }

    if (!shippingAddress.trim()) {
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
        const invalidIds = new Set(invalidItems.map((item) => item.id))

        setCart((current) => current.filter((item) => !invalidIds.has(item.id)))
        openNotice(
          'error',
          'Giỏ hàng có sản phẩm đã thay đổi hoặc không đủ tồn kho. Tôi đã xóa sản phẩm lỗi, vui lòng kiểm tra lại giỏ hàng.',
        )
        return
      }

      const payload = {
        shippingAddress,
        paymentMethod,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      }

      const createdOrder = await api.createOrder(payload, authToken)
      setCart([])
      setOrderCount((current) => current + 1)
      openNotice('success', createdOrder?.message || '\u0110\u1eb7t h\u00e0ng th\u00e0nh c\u00f4ng.')
      navigate('/orders')
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

  let content = null
  const needsAuthFirst = !auth && route.name !== 'login'

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
        content = <OrdersPage auth={auth} onNavigate={navigate} onNotify={openNotice} />
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
        key={`${route.pathname}?keyword=${route.query.keyword || ''}&categoryId=${route.query.categoryId || ''}`}
        auth={auth}
        cart={cart}
        categories={categories}
        orderCount={orderCount}
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


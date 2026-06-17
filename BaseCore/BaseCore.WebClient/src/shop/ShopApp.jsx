import {
  startTransition,
  useEffect,
  useRef,
  useState,
} from 'react'
import './shop.css'
import { api } from './api/client.js'
import { ORDER_REFRESH_INTERVAL_MS } from './constants/orders.js'
import { STORAGE_KEYS } from './constants/storage.js'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import OrderBillModal from './components/OrderBillModal.jsx'
import HomePage from './pages/HomePage.jsx'
import StorePage from './pages/StorePage.jsx'
import ProductPage from './pages/ProductPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import { getAuthToken, getAuthUserId, isExpiredToken } from './utils/auth.js'
import { getCouponCode, mergeSavedCoupons } from './utils/coupons.js'
import { formatCurrency } from './utils/formatters.js'
import { countActiveOrders } from './utils/orders.js'
import { parseRoute } from './utils/routes.js'
import { readStorage, writeStorage } from './utils/storage.js'

function readOrderValue(order, ...keys) {
  for (const key of keys) {
    if (order?.[key] !== undefined && order?.[key] !== null) {
      return order[key]
    }
  }

  return undefined
}

function getPaymentMethodLabel(paymentMethod) {
  switch (String(paymentMethod || '').trim().toLowerCase()) {
    case 'cod':
    case 'counter':
      return 'Thanh toán khi nhận hàng'
    case 'bank_transfer':
      return 'Chuyển khoản qua ngân hàng'
    case 'e_wallet':
    case 'momo':
    case 'zalopay':
      return 'Ví điện tử'
    default:
      return 'Chưa xác định'
  }
}

function getPaymentStatusLabel(paymentStatus, paymentMethod) {
  const normalizedStatus = String(paymentStatus || '').trim().toLowerCase()

  if (normalizedStatus === 'paid') {
    return 'Đã thanh toán'
  }

  if (normalizedStatus === 'unpaid' || normalizedStatus === 'pending') {
    return 'Chưa thanh toán'
  }

  return String(paymentMethod || '').trim().toLowerCase() === 'cod'
    ? 'Chưa thanh toán'
    : 'Đã thanh toán'
}

function buildOrderBillFromOrder(order) {
  const details = Array.isArray(order?.details) ? order.details : []
  const items = details.map((detail) => {
    const product = detail.product || detail.Product || {}
    const quantity = Number(readOrderValue(detail, 'quantity', 'Quantity') || 0)
    const unitPrice = Number(readOrderValue(detail, 'unitPrice', 'UnitPrice') || 0)
    const productId = readOrderValue(detail, 'productId', 'ProductId')
    const productName = readOrderValue(product, 'name', 'Name') || `Sản phẩm #${productId}`

    return {
      id: readOrderValue(detail, 'id', 'Id') || productId,
      name: productName,
      quantity,
      unitPrice,
      amount: quantity * unitPrice,
    }
  })
  const itemSubtotalAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const subtotalFromOrder = readOrderValue(order, 'originalAmount', 'OriginalAmount')
  const subtotalAmount = subtotalFromOrder !== undefined
    ? Number(subtotalFromOrder)
    : itemSubtotalAmount
  const discountAmount = Number(readOrderValue(order, 'discountAmount', 'DiscountAmount') || 0)
  const totalFromOrder = readOrderValue(order, 'totalAmount', 'TotalAmount')
  const paymentMethod = readOrderValue(order, 'paymentMethod', 'PaymentMethod') || ''
  const paymentStatus = readOrderValue(order, 'paymentStatus', 'PaymentStatus') || ''

  return {
    orderId: readOrderValue(order, 'id', 'Id'),
    orderDate: readOrderValue(order, 'orderDate', 'OrderDate') || new Date().toISOString(),
    customerName: readOrderValue(order, 'customerName', 'CustomerName', 'customerUserName', 'CustomerUserName') || '',
    customerPhone: readOrderValue(order, 'customerPhone', 'CustomerPhone') || '',
    customerEmail: readOrderValue(order, 'customerEmail', 'CustomerEmail') || '',
    customerAddress: readOrderValue(order, 'shippingAddress', 'ShippingAddress') || '',
    items,
    subtotalAmount,
    discountAmount,
    promotionName: readOrderValue(order, 'promotionName', 'PromotionName') || '',
    paymentMethod,
    paymentMethodLabel: readOrderValue(order, 'paymentMethodLabel', 'PaymentMethodLabel') || getPaymentMethodLabel(paymentMethod),
    paymentStatus,
    paymentStatusLabel: readOrderValue(order, 'paymentStatusLabel', 'PaymentStatusLabel') || getPaymentStatusLabel(paymentStatus, paymentMethod),
    totalAmount: totalFromOrder !== undefined ? Number(totalFromOrder) : Math.max(0, subtotalAmount - discountAmount),
  }
}

function App() {
  const [route, setRoute] = useState(parseRoute)
  const [auth, setAuth] = useState(() => readStorage(STORAGE_KEYS.auth, null))
  const [cart, setCart] = useState(() => readStorage(STORAGE_KEYS.cart, []))
  const [checkoutItems, setCheckoutItems] = useState(null)
  const [savedCoupons, setSavedCoupons] = useState(() => readStorage(STORAGE_KEYS.savedCoupons, []))
  const [categories, setCategories] = useState([])
  const [coupons, setCoupons] = useState([])
  const [couponLoadError, setCouponLoadError] = useState(false)
  const [highlightedProducts, setHighlightedProducts] = useState([])
  const [topSellingProducts, setTopSellingProducts] = useState([])
  const [loadingHomeData, setLoadingHomeData] = useState(true)
  const [notice, setNotice] = useState(null)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [orderBill, setOrderBill] = useState(null)
  const [orderBadgeCount, setOrderBadgeCount] = useState(0)
  const [customerOrders, setCustomerOrders] = useState([])
  const [orderBadgeRefreshKey, setOrderBadgeRefreshKey] = useState(0)
  const noticeTimeoutRef = useRef(null)
  const authToken = getAuthToken(auth)

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cart, cart)
  }, [cart])

  useEffect(() => {
    writeStorage(STORAGE_KEYS.savedCoupons, savedCoupons)
  }, [savedCoupons])

  useEffect(() => {
    if (auth) {
      writeStorage(STORAGE_KEYS.auth, auth)
    } else {
      localStorage.removeItem(STORAGE_KEYS.auth)
    }

    window.dispatchEvent(new Event('auth-changed'))
  }, [auth])

  useEffect(() => {
    if (!authToken || isExpiredToken(authToken)) {
      setOrderBadgeCount(0)
      setCustomerOrders([])
      return undefined
    }

    let cancelled = false

    async function loadOrderBadgeCount() {
      try {
        const response = await api.getOrders(authToken)
        if (!cancelled) {
          const orderList = Array.isArray(response) ? response : []
          setCustomerOrders(orderList)
          setOrderBadgeCount(countActiveOrders(orderList))
        }
      } catch {
        if (!cancelled) {
          setCustomerOrders([])
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
        const [categoryData, productData, topSellingProductData, couponData] = await Promise.all([
          api.getCategories(),
          api.getProducts({ page: 1, pageSize: 12 }),
          api.getProducts({ sortBy: 'bestSelling', page: 1, pageSize: 12 }),
          fetchPublicCoupons(),
        ])

        if (cancelled) {
          return
        }

        setCategories(Array.isArray(categoryData) ? categoryData : [])
        setCouponLoadError(couponData.error)
        setCoupons(Array.isArray(couponData.data) ? couponData.data : [])
        setHighlightedProducts(productData.items || [])
        setTopSellingProducts((topSellingProductData.items || [])
          .filter((product) => Number(product.soldQuantity ?? product.SoldQuantity ?? 0) > 0)
          .slice(0, 4))
      } catch {
        if (!cancelled) {
          setCategories([])
          setCouponLoadError(true)
          setCoupons([])
          setHighlightedProducts([])
          setTopSellingProducts([])
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

  async function fetchPublicCoupons() {
    try {
      const couponData = await api.getPublicCoupons()
      return { data: couponData, error: false }
    } catch {
      return { data: [], error: true }
    }
  }

  async function refreshShellData() {
    try {
      const [categoryData, productData, topSellingProductData, couponData] = await Promise.all([
        api.getCategories(),
        api.getProducts({ page: 1, pageSize: 12 }),
        api.getProducts({ sortBy: 'bestSelling', page: 1, pageSize: 12 }),
        fetchPublicCoupons(),
      ])

      setCategories(Array.isArray(categoryData) ? categoryData : [])
      setCouponLoadError(couponData.error)
      setCoupons(Array.isArray(couponData.data) ? couponData.data : [])
      setHighlightedProducts(productData.items || [])
      setTopSellingProducts((topSellingProductData.items || [])
        .filter((product) => Number(product.soldQuantity ?? product.SoldQuantity ?? 0) > 0)
        .slice(0, 4))
    } catch (requestError) {
      openNotice('error', requestError.message)
    }
  }

  function saveCoupon(coupon) {
    const code = getCouponCode(coupon)

    if (!code) {
      return
    }

    setSavedCoupons((current) => mergeSavedCoupons(current, coupon))
    openNotice('success', `Đã lưu mã ${code}. Bạn có thể chọn mã này ở bước thanh toán.`)
  }

  function removeCouponAfterUse(code) {
    if (!code) {
      return
    }

    setSavedCoupons((current) =>
      (Array.isArray(current) ? current : []).filter((coupon) => getCouponCode(coupon) !== code),
    )
    setCoupons((current) =>
      (Array.isArray(current) ? current : []).filter((coupon) => getCouponCode(coupon) !== code),
    )
  }

  function navigate(path, options = {}) {
    const targetPathname = new URL(path, window.location.origin).pathname
    if (targetPathname !== '/checkout' || !options.keepCheckoutItems) {
      setCheckoutItems(null)
    }

    if (`${window.location.pathname}${window.location.search}` === path) {
      return
    }

    window.history.pushState({}, '', path)

    const currentPathname = window.location.pathname
    if (currentPathname !== targetPathname) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    startTransition(() => setRoute(parseRoute()))
  }

  function buildCartItem(product, quantity) {
    if (!product) {
      return null
    }

    const safeQuantity = Math.max(1, Number(quantity || 1))
    const cartKey = product.cartKey || String(product.id)

    return {
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
    }
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
    const checkoutItem = buildCartItem(product, quantity)

    if (!checkoutItem) {
      return
    }

    setCheckoutItems([checkoutItem])
    navigate('/checkout', { keepCheckoutItems: true })
  }

  function removeCartItem(cartKey) {
    setCart((current) => current.filter((item) => (item.cartKey || String(item.id)) !== String(cartKey)))
    openNotice('success', 'Đã xóa sản phẩm khỏi giỏ hàng.')
  }

  async function login(username, password) {
    const data = await api.login(username, password)
    writeStorage(STORAGE_KEYS.auth, data)
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
      address: payload.address?.trim() || '',
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
    setAuth((current) => {
      const nextAddress =
        updatedUser.address ?? updatedUser.Address ?? payload.address ?? current?.address ?? current?.Address ?? ''

      return {
        ...current,
        name: updatedUser.name || updatedUser.Name || payload.name || current?.name || current?.Name,
        Name: updatedUser.name || updatedUser.Name || payload.name || current?.Name || current?.name,
        email: updatedUser.email || updatedUser.Email || payload.email || current?.email || current?.Email,
        Email: updatedUser.email || updatedUser.Email || payload.email || current?.Email || current?.email,
        phone: updatedUser.phone || updatedUser.Phone || payload.phone || current?.phone || current?.Phone,
        Phone: updatedUser.phone || updatedUser.Phone || payload.phone || current?.Phone || current?.phone,
        address: nextAddress,
        Address: nextAddress,
      }
    })
    openNotice('success', payload.password ? 'Đã đổi mật khẩu.' : 'Đã cập nhật thông tin tài khoản.')
  }

  function logout() {
    setAuth(null)
    openNotice('success', 'Đã đăng xuất tài khoản.')
  }

  async function placeOrder(shippingInfo, paymentMethod, selectedCoupon, orderItems) {
    const authToken = getAuthToken(auth)
    const activeAuthToken = authToken && !isExpiredToken(authToken) ? authToken : ''
    const customerName = shippingInfo?.customerName?.trim() || ''
    const customerEmail = shippingInfo?.customerEmail?.trim() || ''
    const customerPhone = shippingInfo?.customerPhone?.trim() || ''
    const shippingAddress = shippingInfo?.shippingAddress?.trim() || ''
    const couponCode = getCouponCode(selectedCoupon)
    const checkoutCart = Array.isArray(orderItems) ? orderItems : cart
    const isDirectCheckout = Array.isArray(checkoutItems)

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

    if (checkoutCart.length === 0) {
      openNotice('error', 'Gi\u1ecf h\u00e0ng \u0111ang tr\u1ed1ng.')
      return
    }

    setPlacingOrder(true)

    try {
      const productChecks = await Promise.allSettled(
        checkoutCart.map((item) => api.getProduct(item.id)),
      )
      const invalidItems = checkoutCart.filter((item, index) => {
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

        if (isDirectCheckout) {
          setCheckoutItems([])
        } else {
          setCart((current) =>
            current.filter((item) => !invalidKeys.has(item.cartKey || String(item.id))),
          )
        }
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
        couponCode,
        items: checkoutCart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
      }

      const createdOrder = await api.createOrder(payload, activeAuthToken)
      if (isDirectCheckout) {
        setCheckoutItems(null)
      } else {
        setCart([])
      }
      removeCouponAfterUse(couponCode)
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

  function closeOrderBill() {
    setOrderBill(null)
  }

  function goAfterOrderBill() {
    const redirectPath = orderBill?.redirectPath || '/store'
    setOrderBill(null)
    navigate(redirectPath)
  }

  function exportOrderBill(order) {
    setOrderBill({
      ...buildOrderBillFromOrder(order),
      redirectPath: '/orders',
    })
  }

  const cartSummary = {
    count: cart.reduce((sum, item) => sum + item.quantity, 0),
    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
  }

  let content = null
  // anti-slop guidelines (ACCESSIBILITY & SECURITY GUARDRAILS):
  // Bắt buộc xác thực với route 'checkout' để tránh tạo đơn hàng dưới tài khoản khách vãng lai ảo.
  const authRequiredRoutes = new Set(['orders', 'account', 'checkout'])
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
            coupons={coupons}
            couponLoadError={couponLoadError}
            savedCouponCodes={savedCoupons.map(getCouponCode)}
            highlightedProducts={highlightedProducts}
            topSellingProducts={topSellingProducts}
            onNavigate={navigate}
            onAddToCart={upsertCart}
            onBuyNow={buyNow}
            onSaveCoupon={saveCoupon}
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
            reviewTarget={route.hash}
            auth={auth}
            categories={categories}
            onNavigate={navigate}
            onAddToCart={upsertCart}
            onBuyNow={buyNow}
            onNotify={openNotice}
          />
        )
        break
      case 'checkout':
        content = (
          <CheckoutPage
            auth={auth}
            cart={checkoutItems || cart}
            savedCoupons={savedCoupons}
            customerOrders={customerOrders}
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
            onExportInvoice={exportOrderBill}
            onOrdersChanged={() => setOrderBadgeRefreshKey((current) => current + 1)}
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

      {orderBill && (
        <OrderBillModal
          bill={orderBill}
          onClose={closeOrderBill}
          onGoNext={goAfterOrderBill}
          goNextLabel={auth ? 'Xem \u0111\u01a1n h\u00e0ng' : 'Ti\u1ebfp t\u1ee5c mua'}
        />
      )}

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

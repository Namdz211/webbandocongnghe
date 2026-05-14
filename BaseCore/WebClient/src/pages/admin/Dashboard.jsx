import { useEffect, useState } from 'react'
import PageHeader from '../../components/admin/PageHeader'
import Spinner from '../../components/admin/Spinner'
import StatBox from '../../components/admin/StatBox'
import { adminApi, getToken, normalizeProductList } from '../../utils/admin'

function Dashboard({ auth }) {
  const token = getToken(auth)
  const [stats, setStats] = useState({ products: 0, categories: 0, users: 0, orders: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadStats() {
      setLoading(true)
      try {
        const [productData, categoryData] = await Promise.all([
          adminApi.getProducts({ page: 1, pageSize: 1 }),
          adminApi.getCategories(),
        ])
        let usersCount = 0

        try {
          const usersData = await adminApi.getUsers({ page: 1, pageSize: 1 }, token)
          usersCount = usersData?.totalCount || 0
        } catch {
          usersCount = 0
        }

        let ordersCount = 0
        try {
          const orderData = await adminApi.getOrders(token)
          ordersCount = Array.isArray(orderData) ? orderData.length : 0
        } catch {
          ordersCount = 0
        }

        if (!cancelled) {
          setStats({
            products: normalizeProductList(productData).totalCount,
            categories: Array.isArray(categoryData) ? categoryData.length : 0,
            users: usersCount,
            orders: ordersCount,
          })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadStats()
    return () => {
      cancelled = true
    }
  }, [token])

  if (loading) {
    return <Spinner />
  }

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="admin-stat-grid">
        <StatBox color="primary" icon="fa-shopping-cart" label="Orders" value={stats.orders} />
        <StatBox color="info" icon="fa-archive" label="Products" value={stats.products} />
        <StatBox color="success" icon="fa-tags" label="Categories" value={stats.categories} />
        <StatBox color="warning" icon="fa-users" label="Users" value={stats.users} />
      </div>
      <section className="admin-card">
        <h3>Welcome to BaseCore Sales System</h3>
        <p>Admin area for orders, products, categories, and users connected to the FW backend.</p>
      </section>
    </>
  )
}

export default Dashboard

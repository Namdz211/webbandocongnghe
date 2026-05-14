import { useEffect, useState } from 'react'
import AdminModal from '../../components/admin/AdminModal'
import DataTable from '../../components/admin/DataTable'
import PageHeader from '../../components/admin/PageHeader'
import ProductForm from '../../components/admin/ProductForm'
import RowActions from '../../components/admin/RowActions'
import Spinner from '../../components/admin/Spinner'
import { adminApi, formatCurrency, getToken, normalizeProductList } from '../../utils/admin'

function Products({ auth, onDataChanged }) {
  const token = getToken(auth)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    stock: 0,
    description: '',
    imageUrl: '',
    categoryId: '',
  })

  async function loadData() {
    setLoading(true)
    try {
      const [productData, categoryData] = await Promise.all([
        adminApi.getProducts({ keyword, categoryId, page: 1, pageSize: 100 }),
        adminApi.getCategories(),
      ])
      setProducts(normalizeProductList(productData).items)
      setCategories(Array.isArray(categoryData) ? categoryData : [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function openModal(product = null) {
    setEditingProduct(product)
    setError('')
    setFormData(
      product
        ? {
            name: product.name || '',
            price: product.price || 0,
            stock: product.stock || 0,
            description: product.description || '',
            imageUrl: product.imageUrl || '',
            categoryId: product.categoryId || product.category?.id || '',
          }
        : {
            name: '',
            price: 0,
            stock: 0,
            description: '',
            imageUrl: '',
            categoryId: categories[0]?.id || '',
          },
    )
    setShowModal(true)
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    const payload = {
      ...formData,
      price: Number(formData.price),
      stock: Number(formData.stock),
      categoryId: Number(formData.categoryId),
    }

    try {
      if (editingProduct) {
        await adminApi.updateProduct(editingProduct.id, payload, token)
      } else {
        await adminApi.createProduct(payload, token)
      }
      setShowModal(false)
      await loadData()
      await onDataChanged()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function remove(product) {
    if (!window.confirm(`Delete product "${product.name}"?`)) {
      return
    }

    try {
      await adminApi.deleteProduct(product.id, token)
      await loadData()
      await onDataChanged()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <>
      <PageHeader title="Products Management" />
      <section className="admin-card">
        <div className="admin-card-toolbar">
          <form
            className="admin-search"
            onSubmit={(event) => {
              event.preventDefault()
              loadData()
            }}
          >
            <input className="admin-control" placeholder="Search..." value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            <select className="admin-control" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button className="admin-btn primary" type="submit">
              <i className="fa fa-search" /> Search
            </button>
          </form>
          <button className="admin-btn success" type="button" onClick={() => openModal()}>
            <i className="fa fa-plus" /> Add Product
          </button>
        </div>
        {error && <div className="admin-alert danger">{error}</div>}
        {loading ? (
          <Spinner />
        ) : (
          <DataTable
            emptyText="No products found"
            headers={['ID', 'Name', 'Category', 'Price', 'Stock', 'Actions']}
            rows={products.map((product) => [
              product.id,
              product.name,
              product.category?.name || categories.find((category) => category.id === product.categoryId)?.name || '',
              formatCurrency(product.price),
              product.stock,
              <RowActions key="actions" onEdit={() => openModal(product)} onDelete={() => remove(product)} />,
            ])}
          />
        )}
      </section>
      {showModal && (
        <AdminModal title={editingProduct ? 'Edit Product' : 'Add Product'} onClose={() => setShowModal(false)}>
          <ProductForm
            categories={categories}
            error={error}
            formData={formData}
            setFormData={setFormData}
            onSubmit={submit}
            submitText={editingProduct ? 'Update' : 'Create'}
          />
        </AdminModal>
      )}
    </>
  )
}

export default Products

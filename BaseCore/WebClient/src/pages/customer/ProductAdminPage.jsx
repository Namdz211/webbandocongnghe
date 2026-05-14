import { useEffect, useState } from 'react'
import LinkButton from '../../components/LinkButton'
import { api } from '../../api'
import {
  formatCurrency,
  getAuthToken,
  getProductImage,
  handleProductImageError,
  isAdmin,
  isExpiredToken,
  normalizeProductImageUrl,
} from '../../utils/storefront'

const EMPTY_PRODUCT_FORM = {
  name: '',
  price: '',
  stock: '',
  categoryId: '',
  imageUrl: '/electro/img/product01.png',
  description: '',
}

function ProductAdminPage({
  auth,
  categories,
  onNavigate,
  onNotify,
  onAdminProductsChanged,
}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(Boolean(auth))
  const [error, setError] = useState('')
  const [formData, setFormData] = useState(EMPTY_PRODUCT_FORM)
  const [editingProductId, setEditingProductId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const canManageProducts = isAdmin(auth)
  const authToken = getAuthToken(auth)
  const adminTokenExpired = isExpiredToken(authToken)

  useEffect(() => {
    if (!formData.categoryId && categories.length > 0) {
      setFormData((current) => ({
        ...current,
        categoryId: String(categories[0].id),
      }))
    }
  }, [categories, formData.categoryId])

  useEffect(() => {
    if (!canManageProducts) {
      setProducts([])
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadProducts() {
      setLoading(true)
      setError('')

      try {
        const response = await api.getProducts({ page: 1, pageSize: 100 })

        if (!cancelled) {
          setProducts(response.items || [])
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      cancelled = true
    }
  }, [canManageProducts, reloadKey])

  const resetForm = () => {
    setEditingProductId(null)
    setFormData({
      ...EMPTY_PRODUCT_FORM,
      categoryId: categories[0]?.id ? String(categories[0].id) : '',
    })
  }

  const changeField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const submitProduct = async (event) => {
    event.preventDefault()

    if (!canManageProducts || !authToken) {
      setError('Bạn cần đăng nhập bằng tài khoản admin để quản lý sản phẩm.')
      return
    }

    if (adminTokenExpired) {
      setError('Phiên đăng nhập admin đã hết hạn. Hãy đăng nhập lại rồi thêm sản phẩm.')
      return
    }

    const payload = {
      name: formData.name.trim(),
      price: Number(formData.price),
      stock: Number(formData.stock),
      categoryId: Number(formData.categoryId),
      imageUrl: normalizeProductImageUrl(formData.imageUrl),
      description: formData.description.trim(),
    }

    if (!payload.name || Number.isNaN(payload.price) || Number.isNaN(payload.stock) || !payload.categoryId) {
      setError('Vui lòng nhập đầy đủ tên, giá, tồn kho và danh mục.')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (editingProductId) {
        await api.updateProduct(editingProductId, payload, authToken)
        onNotify('success', 'Đã cập nhật sản phẩm.')
      } else {
        await api.createProduct(payload, authToken)
        onNotify('success', 'Đã thêm sản phẩm mới.')
      }

      resetForm()
      setReloadKey((current) => current + 1)
      await onAdminProductsChanged()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const editProduct = (product) => {
    setEditingProductId(product.id)
    setFormData({
      name: product.name || '',
      price: String(product.price ?? ''),
      stock: String(product.stock ?? ''),
      categoryId: String(product.categoryId || product.category?.id || ''),
      imageUrl: normalizeProductImageUrl(product.imageUrl),
      description: product.description || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteProduct = async (product) => {
    if (!window.confirm(`Xóa sản phẩm "${product.name}"?`)) {
      return
    }

    if (!authToken || adminTokenExpired) {
      setError('Phiên đăng nhập admin đã hết hạn. Hãy đăng nhập lại rồi xóa sản phẩm.')
      return
    }

    setDeletingId(product.id)
    setError('')

    try {
      await api.deleteProduct(product.id, authToken)
      onNotify('success', 'Đã xóa sản phẩm.')
      setReloadKey((current) => current + 1)
      await onAdminProductsChanged()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setDeletingId(null)
    }
  }

  const getCategoryName = (product) =>
    product.category?.name ||
    categories.find((category) => category.id === product.categoryId)?.name ||
    'Không xác định'

  return (
    <>
      <div id="breadcrumb" className="section">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <h3 className="breadcrumb-header">Quản trị sản phẩm</h3>
              <ul className="breadcrumb-tree">
                <li>
                  <LinkButton to="/" onNavigate={onNavigate}>
                    Trang chủ
                  </LinkButton>
                </li>
                <li className="active">Thêm, sửa, xóa sản phẩm</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          {!auth ? (
            <div className="empty-state">
              Bạn cần đăng nhập tài khoản admin để quản lý sản phẩm.
              <div className="empty-actions">
                <LinkButton to="/login?redirect=/admin/products" className="primary-btn" onNavigate={onNavigate}>
                  Đăng nhập admin
                </LinkButton>
              </div>
            </div>
          ) : adminTokenExpired ? (
            <div className="empty-state error-state">
              Phiên đăng nhập admin đã hết hạn. Hãy đăng nhập lại để thêm, sửa, xóa sản phẩm.
              <div className="empty-actions">
                <LinkButton to="/login?redirect=/admin/products" className="primary-btn" onNavigate={onNavigate}>
                  Đăng nhập lại
                </LinkButton>
              </div>
            </div>
          ) : !canManageProducts ? (
            <div className="empty-state error-state">
              Tài khoản hiện tại không có quyền admin nên không thể thêm, sửa, xóa sản phẩm.
            </div>
          ) : (
            <div className="admin-products-layout">
              <form className="admin-product-form-card" onSubmit={submitProduct}>
                <div className="section-title">
                  <h3 className="title">
                    {editingProductId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
                  </h3>
                </div>

                {error && <div className="error-banner">{error}</div>}

                <input
                  className="input"
                  placeholder="Tên sản phẩm"
                  value={formData.name}
                  onChange={(event) => changeField('name', event.target.value)}
                  required
                />
                <div className="admin-form-grid">
                  <input
                    className="input"
                    min="0"
                    placeholder="Giá"
                    type="number"
                    value={formData.price}
                    onChange={(event) => changeField('price', event.target.value)}
                    required
                  />
                  <input
                    className="input"
                    min="0"
                    placeholder="Tồn kho"
                    type="number"
                    value={formData.stock}
                    onChange={(event) => changeField('stock', event.target.value)}
                    required
                  />
                </div>
                <select
                  className="input-select admin-select"
                  value={formData.categoryId}
                  onChange={(event) => changeField('categoryId', event.target.value)}
                  required
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  placeholder="Ảnh, ví dụ: macbookneo.png hoặc /electro/img/product01.png"
                  value={formData.imageUrl}
                  onChange={(event) => changeField('imageUrl', event.target.value)}
                />
                <textarea
                  className="input"
                  placeholder="Mô tả sản phẩm"
                  rows="4"
                  value={formData.description}
                  onChange={(event) => changeField('description', event.target.value)}
                />

                <div className="admin-form-actions">
                  <button className="primary-btn" type="submit" disabled={saving || categories.length === 0}>
                    {saving
                      ? 'Đang lưu...'
                      : editingProductId
                        ? 'Cập nhật'
                        : 'Thêm sản phẩm'}
                  </button>
                  {editingProductId && (
                    <button className="secondary-btn" type="button" onClick={resetForm}>
                      Hủy sửa
                    </button>
                  )}
                </div>
              </form>

              <div className="admin-product-table-card">
                <div className="section-title">
                  <h3 className="title">Danh sách sản phẩm</h3>
                </div>

                {loading ? (
                  <div className="empty-state">Đang tải sản phẩm...</div>
                ) : products.length === 0 ? (
                  <div className="empty-state">Chưa có sản phẩm nào.</div>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-products-table">
                      <thead>
                        <tr>
                          <th>Sản phẩm</th>
                          <th>Danh mục</th>
                          <th>Giá</th>
                          <th>Tồn kho</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product) => (
                          <tr key={product.id}>
                            <td>
                              <div className="admin-product-cell">
                                <img
                                  src={getProductImage(product)}
                                  alt={product.name}
                                  onError={(event) => handleProductImageError(event, product)}
                                />
                                <div>
                                  <strong>{product.name}</strong>
                                  <span>{product.description || 'Chưa có mô tả'}</span>
                                </div>
                              </div>
                            </td>
                            <td>{getCategoryName(product)}</td>
                            <td>{formatCurrency(product.price)}</td>
                            <td>{product.stock}</td>
                            <td>
                              <div className="admin-row-actions">
                                <button className="secondary-btn" type="button" onClick={() => editProduct(product)}>
                                  Sửa
                                </button>
                                <button
                                  className="danger-btn"
                                  type="button"
                                  disabled={deletingId === product.id}
                                  onClick={() => deleteProduct(product)}
                                >
                                  {deletingId === product.id ? 'Đang xóa...' : 'Xóa'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default ProductAdminPage

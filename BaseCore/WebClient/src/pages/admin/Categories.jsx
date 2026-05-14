import { useEffect, useState } from 'react'
import AdminModal from '../../components/admin/AdminModal'
import DataTable from '../../components/admin/DataTable'
import FormInput from '../../components/admin/FormInput'
import PageHeader from '../../components/admin/PageHeader'
import RowActions from '../../components/admin/RowActions'
import Spinner from '../../components/admin/Spinner'
import { adminApi, getToken } from '../../utils/admin'

function Categories({ auth, onDataChanged }) {
  const token = getToken(auth)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({ name: '', description: '' })

  async function loadData() {
    setLoading(true)
    try {
      const data = await adminApi.getCategories()
      setCategories(Array.isArray(data) ? data : [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function openModal(category = null) {
    setEditingCategory(category)
    setError('')
    setFormData(category ? { name: category.name || '', description: category.description || '' } : { name: '', description: '' })
    setShowModal(true)
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    try {
      if (editingCategory) {
        await adminApi.updateCategory(editingCategory.id, formData, token)
      } else {
        await adminApi.createCategory(formData, token)
      }
      setShowModal(false)
      await loadData()
      await onDataChanged()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function remove(category) {
    if (!window.confirm(`Delete category "${category.name}"?`)) {
      return
    }

    try {
      await adminApi.deleteCategory(category.id, token)
      await loadData()
      await onDataChanged()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <>
      <PageHeader title="Categories Management" />
      <section className="admin-card">
        <div className="admin-card-toolbar">
          <h3>All Categories</h3>
          <button className="admin-btn success" type="button" onClick={() => openModal()}>
            <i className="fa fa-plus" /> Add Category
          </button>
        </div>
        {error && <div className="admin-alert danger">{error}</div>}
        {loading ? (
          <Spinner />
        ) : (
          <DataTable
            emptyText="No categories found"
            headers={['ID', 'Name', 'Description', 'Actions']}
            rows={categories.map((category) => [
              category.id,
              category.name,
              category.description,
              <RowActions key="actions" onEdit={() => openModal(category)} onDelete={() => remove(category)} />,
            ])}
          />
        )}
      </section>
      {showModal && (
        <AdminModal title={editingCategory ? 'Edit Category' : 'Add Category'} onClose={() => setShowModal(false)}>
          <form onSubmit={submit}>
            {error && <div className="admin-alert danger">{error}</div>}
            <FormInput label="Name" value={formData.name} onChange={(value) => setFormData({ ...formData, name: value })} required />
            <label className="admin-label">Description</label>
            <textarea className="admin-control" rows="3" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} />
            <div className="admin-modal-footer">
              <button className="admin-btn primary" type="submit">
                {editingCategory ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  )
}

export default Categories

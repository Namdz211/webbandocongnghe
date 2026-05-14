import { useEffect, useState } from 'react'
import AdminModal from '../../components/admin/AdminModal'
import DataTable from '../../components/admin/DataTable'
import PageHeader from '../../components/admin/PageHeader'
import RowActions from '../../components/admin/RowActions'
import Spinner from '../../components/admin/Spinner'
import UserForm from '../../components/admin/UserForm'
import { adminApi, getToken } from '../../utils/admin'

function Users({ auth }) {
  const token = getToken(auth)
  const [users, setUsers] = useState([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    position: '',
    userType: 0,
    isActive: true,
  })

  async function loadData() {
    setLoading(true)
    try {
      const data = await adminApi.getUsers({ keyword, page: 1, pageSize: 100 }, token)
      setUsers(data?.data || [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function openModal(user = null) {
    setEditingUser(user)
    setError('')
    setFormData(
      user
        ? {
            username: user.username || '',
            password: '',
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            position: user.position || '',
            userType: user.userType || 0,
            isActive: user.isActive,
          }
        : {
            username: '',
            password: '',
            name: '',
            email: '',
            phone: '',
            position: '',
            userType: 0,
            isActive: true,
          },
    )
    setShowModal(true)
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    try {
      if (editingUser) {
        const payload = {
          password: formData.password || undefined,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          position: formData.position,
          userType: Number(formData.userType),
          isActive: formData.isActive,
        }
        await adminApi.updateUser(editingUser.id, payload, token)
      } else {
        await adminApi.createUser(
          {
            username: formData.username,
            password: formData.password,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            position: formData.position,
            userType: Number(formData.userType),
          },
          token,
        )
      }
      setShowModal(false)
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function remove(user) {
    if (!window.confirm(`Delete user "${user.username}"?`)) {
      return
    }

    try {
      await adminApi.deleteUser(user.id, token)
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <>
      <PageHeader title="Users Management" />
      <section className="admin-card">
        <div className="admin-card-toolbar">
          <form
            className="admin-search"
            onSubmit={(event) => {
              event.preventDefault()
              loadData()
            }}
          >
            <input className="admin-control" placeholder="Search by name, email, phone..." value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            <button className="admin-btn primary" type="submit">
              <i className="fa fa-search" /> Search
            </button>
          </form>
          <button className="admin-btn success" type="button" onClick={() => openModal()}>
            <i className="fa fa-plus" /> Add User
          </button>
        </div>
        {error && <div className="admin-alert danger">{error}</div>}
        {loading ? (
          <Spinner />
        ) : (
          <DataTable
            emptyText="No users found"
            headers={['Username', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Actions']}
            rows={users.map((user) => [
              user.username,
              user.name,
              user.email,
              user.phone,
              <span key="role" className={`admin-badge ${user.userType === 1 ? 'danger' : 'info'}`}>
                {user.userType === 1 ? 'Admin' : 'User'}
              </span>,
              <span key="status" className={`admin-badge ${user.isActive ? 'success' : 'secondary'}`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>,
              <RowActions key="actions" onEdit={() => openModal(user)} onDelete={() => remove(user)} />,
            ])}
          />
        )}
      </section>
      {showModal && (
        <AdminModal title={editingUser ? 'Edit User' : 'Add User'} onClose={() => setShowModal(false)}>
          <UserForm editing={Boolean(editingUser)} error={error} formData={formData} setFormData={setFormData} onSubmit={submit} />
        </AdminModal>
      )}
    </>
  )
}

export default Users

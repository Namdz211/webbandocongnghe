import FormInput from './FormInput'

function UserForm({ editing, error, formData, setFormData, onSubmit }) {
  return (
    <form onSubmit={onSubmit}>
      {error && <div className="admin-alert danger">{error}</div>}
      <FormInput label="Username" value={formData.username} onChange={(value) => setFormData({ ...formData, username: value })} required disabled={editing} />
      <FormInput label={editing ? 'Password (leave blank to keep current)' : 'Password'} type="password" value={formData.password} onChange={(value) => setFormData({ ...formData, password: value })} required={!editing} />
      <FormInput label="Name" value={formData.name} onChange={(value) => setFormData({ ...formData, name: value })} />
      <FormInput label="Email" type="email" value={formData.email} onChange={(value) => setFormData({ ...formData, email: value })} />
      <FormInput label="Phone" value={formData.phone} onChange={(value) => setFormData({ ...formData, phone: value })} />
      <FormInput label="Position" value={formData.position} onChange={(value) => setFormData({ ...formData, position: value })} />
      <label className="admin-label">Role</label>
      <select className="admin-control" value={formData.userType} onChange={(event) => setFormData({ ...formData, userType: event.target.value })}>
        <option value="0">User</option>
        <option value="1">Admin</option>
      </select>
      {editing && (
        <label className="admin-check">
          <input type="checkbox" checked={formData.isActive} onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })} />
          Active
        </label>
      )}
      <div className="admin-modal-footer">
        <button className="admin-btn primary" type="submit">
          {editing ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  )
}

export default UserForm

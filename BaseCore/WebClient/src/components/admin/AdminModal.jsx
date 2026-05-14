function AdminModal({ title, onClose, children }) {
  return (
    <>
      <div className="admin-modal-backdrop" onClick={onClose} />
      <div className="admin-modal">
        <div className="admin-modal-header">
          <h3>{title}</h3>
          <button type="button" onClick={onClose}>
            x
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
      </div>
    </>
  )
}

export default AdminModal

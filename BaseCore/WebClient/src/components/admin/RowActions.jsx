function RowActions({ onEdit, onDelete }) {
  return (
    <div className="admin-row-actions">
      <button className="admin-btn small info" type="button" onClick={onEdit}>
        <i className="fa fa-pencil" />
      </button>
      <button className="admin-btn small danger" type="button" onClick={onDelete}>
        <i className="fa fa-trash" />
      </button>
    </div>
  )
}

export default RowActions

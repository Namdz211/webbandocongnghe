import FormInput from './FormInput'

function ProductForm({ categories, error, formData, setFormData, onSubmit, submitText }) {
  return (
    <form onSubmit={onSubmit}>
      {error && <div className="admin-alert danger">{error}</div>}
      <FormInput label="Name" value={formData.name} onChange={(value) => setFormData({ ...formData, name: value })} required />
      <label className="admin-label">Category</label>
      <select className="admin-control" value={formData.categoryId} onChange={(event) => setFormData({ ...formData, categoryId: event.target.value })} required>
        <option value="">Select Category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <FormInput label="Price" type="number" value={formData.price} onChange={(value) => setFormData({ ...formData, price: value })} required />
      <FormInput label="Stock" type="number" value={formData.stock} onChange={(value) => setFormData({ ...formData, stock: value })} required />
      <FormInput label="Image URL" value={formData.imageUrl} onChange={(value) => setFormData({ ...formData, imageUrl: value })} />
      <label className="admin-label">Description</label>
      <textarea className="admin-control" rows="3" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} />
      <div className="admin-modal-footer">
        <button className="admin-btn primary" type="submit">
          {submitText}
        </button>
      </div>
    </form>
  )
}

export default ProductForm

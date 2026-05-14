function FormInput({ label, value, onChange, type = 'text', required = false, disabled = false }) {
  return (
    <>
      <label className="admin-label">{label}</label>
      <input className="admin-control" type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} disabled={disabled} />
    </>
  )
}

export default FormInput

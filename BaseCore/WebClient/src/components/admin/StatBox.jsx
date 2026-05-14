function StatBox({ color, icon, label, value }) {
  return (
    <div className={`admin-stat ${color}`}>
      <div>
        <h3>{value}</h3>
        <p>{label}</p>
      </div>
      <i className={`fa ${icon}`} />
    </div>
  )
}

export default StatBox

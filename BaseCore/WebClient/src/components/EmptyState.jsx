export default function EmptyState({ message = 'No data found.', children }) {
  return (
    <div className="empty-state">
      {message}
      {children}
    </div>
  )
}

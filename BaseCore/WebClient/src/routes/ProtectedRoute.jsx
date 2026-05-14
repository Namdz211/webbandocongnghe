export default function ProtectedRoute({ allowed = true, fallback = null, children }) {
  return allowed ? children : fallback
}

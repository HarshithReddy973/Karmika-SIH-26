import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'

// Wrap any page with this to require login (and optionally a specific role).
// Usage: <ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>
export default function ProtectedRoute({ children, allowedRole }) {
  const { isLoggedIn, profile, loading } = useAuth()

  if (loading) return <p>Loading...</p>
  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (allowedRole && profile?.role !== allowedRole) return <Navigate to="/" replace />

  return children
}

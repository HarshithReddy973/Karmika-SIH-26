import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'

// This is what "/" points to. It looks at the logged-in user's role
// and sends them to the correct home page - this is the "Role Redirect"
// page from the pages/flowchart doc.
export default function HomeRedirect() {
  const { isLoggedIn, profile, loading } = useAuth()

  if (loading) return <div className="page"><div className="loading-row"><span className="spinner" /><span>Loading...</span></div></div>
  if (!isLoggedIn) return <Navigate to="/login" replace />

  if (profile?.role === 'worker') return <Navigate to="/worker" replace />
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />
  return <Navigate to="/customer" replace />
}

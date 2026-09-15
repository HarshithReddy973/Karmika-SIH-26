import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomeRedirect from './pages/HomeRedirect'
import LoginSignup from './pages/LoginSignup'
import CustomerHome from './pages/CustomerHome'
import WorkerHome from './pages/WorkerHome'
import AdminHome from './pages/AdminHome'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginSignup />} />

        <Route
          path="/customer"
          element={
            <ProtectedRoute allowedRole="customer">
              <CustomerHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker"
          element={
            <ProtectedRoute allowedRole="worker">
              <WorkerHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminHome />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

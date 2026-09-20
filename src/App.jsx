import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomeRedirect from './pages/HomeRedirect'
import LoginSignup from './pages/LoginSignup'
import BrowseServices from './pages/BrowseServices'
import BookService from './pages/BookService'
import MatchedWorkers from './pages/MatchedWorkers'
import MyBookings from './pages/MyBookings'
import BookingTracker from './pages/BookingTracker'
import PaymentSummary from './pages/PaymentSummary'
import RateReview from './pages/RateReview'
import WorkerJobRequests from './pages/WorkerJobRequests'
import WorkerJobCompletion from './pages/WorkerJobCompletion'
import WorkerProfileSetup from './pages/WorkerProfileSetup'
import AdminDashboard from './pages/AdminDashboard'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginSignup />} />

        {/* Customer routes - Phase 2 */}
        <Route path="/customer" element={<ProtectedRoute allowedRole="customer"><BrowseServices /></ProtectedRoute>} />
        <Route path="/customer/book/:serviceId" element={<ProtectedRoute allowedRole="customer"><BookService /></ProtectedRoute>} />
        <Route path="/customer/matches/:bookingId" element={<ProtectedRoute allowedRole="customer"><MatchedWorkers /></ProtectedRoute>} />
        <Route path="/customer/bookings" element={<ProtectedRoute allowedRole="customer"><MyBookings /></ProtectedRoute>} />
        <Route path="/customer/bookings/:bookingId" element={<ProtectedRoute allowedRole="customer"><BookingTracker /></ProtectedRoute>} />
        <Route path="/customer/bookings/:bookingId/payment" element={<ProtectedRoute allowedRole="customer"><PaymentSummary /></ProtectedRoute>} />
        <Route path="/customer/bookings/:bookingId/review" element={<ProtectedRoute allowedRole="customer"><RateReview /></ProtectedRoute>} />

        {/* Worker routes - Phase 2 */}
        <Route path="/worker" element={<ProtectedRoute allowedRole="worker"><WorkerJobRequests /></ProtectedRoute>} />
        <Route path="/worker/job/:bookingId/complete" element={<ProtectedRoute allowedRole="worker"><WorkerJobCompletion /></ProtectedRoute>} />
        <Route path="/worker/profile" element={<ProtectedRoute allowedRole="worker"><WorkerProfileSetup /></ProtectedRoute>} />

        {/* Admin routes - Phase 4 */}
        <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import AdminKYCList from './admin/AdminKYCList.jsx'
import AdminKYCDetail from './admin/AdminKYCDetail.jsx'
import VehicleTypeList from './admin/VehicleTypeList.jsx'
import FleetPage from './fleet/FleetPage.jsx'
import AvailabilityPage from './availability/AvailabilityPage.jsx'
import OwnerBookingsPage from './bookings/OwnerBookingsPage.jsx'
import CustomerBookingsPage from './bookings/CustomerBookingsPage.jsx'
import RateCardPage from './admin/RateCardPage.jsx'
import AdminAuthGuard from './admin/AdminAuthGuard.jsx'
import AdminLogin from './admin/AdminLogin.jsx'
import AdminDashboard from './admin/AdminDashboard.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminAuthGuard><AdminDashboard /></AdminAuthGuard>} />
        <Route path="/admin/kyc" element={<AdminAuthGuard><AdminKYCList /></AdminAuthGuard>} />
        <Route path="/admin/kyc/:type/:id" element={<AdminAuthGuard><AdminKYCDetail /></AdminAuthGuard>} />
        <Route path="/admin/vehicle-types" element={<AdminAuthGuard><VehicleTypeList /></AdminAuthGuard>} />
        <Route path="/admin/rate-cards" element={<AdminAuthGuard><RateCardPage /></AdminAuthGuard>} />
        <Route path="/fleet" element={<FleetPage />} />
        <Route path="/availability" element={<AvailabilityPage />} />
        <Route path="/bookings/owner" element={<OwnerBookingsPage />} />
        <Route path="/bookings/customer" element={<CustomerBookingsPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

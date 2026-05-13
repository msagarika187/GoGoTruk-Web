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
import AdminGuard from './admin/AdminGuard.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin/kyc" element={<AdminGuard><AdminKYCList /></AdminGuard>} />
        <Route path="/admin/kyc/:type/:id" element={<AdminGuard><AdminKYCDetail /></AdminGuard>} />
        <Route path="/admin/vehicle-types" element={<AdminGuard><VehicleTypeList /></AdminGuard>} />
        <Route path="/admin/rate-cards" element={<AdminGuard><RateCardPage /></AdminGuard>} />
        <Route path="/fleet" element={<FleetPage />} />
        <Route path="/availability" element={<AvailabilityPage />} />
        <Route path="/bookings/owner" element={<OwnerBookingsPage />} />
        <Route path="/bookings/customer" element={<CustomerBookingsPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

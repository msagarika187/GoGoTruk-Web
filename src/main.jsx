import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import AdminKYCList from './admin/AdminKYCList.jsx'
import AdminKYCDetail from './admin/AdminKYCDetail.jsx'
import VehicleTypeList from './admin/VehicleTypeList.jsx'
import FleetPage from './fleet/FleetPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin/kyc" element={<AdminKYCList />} />
        <Route path="/admin/kyc/:type/:id" element={<AdminKYCDetail />} />
        <Route path="/admin/vehicle-types" element={<VehicleTypeList />} />
        <Route path="/fleet" element={<FleetPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

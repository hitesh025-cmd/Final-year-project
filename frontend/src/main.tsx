import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './style.css'
import type { Donor, BloodRequest, BloodInventoryItem, Hospital } from './types'
import { BLOOD_GROUPS } from './constants'
import { PublicApp } from './PublicApp'
import { AdminPortal } from './AdminPortal'

const defaultInventory: BloodInventoryItem[] = BLOOD_GROUPS.map(bloodGroup => ({
  bloodGroup,
  units: 0,
}))

const App: React.FC = () => {
  const [donors, setDonors] = React.useState<Donor[]>([])
  const [requests, setRequests] = React.useState<BloodRequest[]>([])
  const [inventory, setInventory] = React.useState<BloodInventoryItem[]>(defaultInventory)
  const [hospitals, setHospitals] = React.useState<Hospital[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    Promise.all([
      fetch('/api/donors').then(r => r.ok ? r.json() : []),
      fetch('/api/requests').then(r => r.ok ? r.json() : []),
      fetch('/api/inventory').then(r => r.ok ? r.json() : []),
      fetch('/api/hospitals').then(r => r.ok ? r.json() : [])
    ]).then(([d, reqs, inv, hosp]) => {
      setDonors(Array.isArray(d) ? d : [])
      setRequests(Array.isArray(reqs) ? reqs : [])
      setInventory(Array.isArray(inv) && inv.length > 0 ? inv : defaultInventory)
      setHospitals(Array.isArray(hosp) ? hosp : [])
      setLoading(false)
    }).catch(err => {
      console.error('API Error:', err)
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Connecting to database...</div>


  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicApp
              donors={donors}
              setDonors={setDonors}
              requests={requests}
              setRequests={setRequests}
              hospitals={hospitals}
            />
          }
        />
        <Route
          path="/admin"
          element={
            <AdminPortal
              donors={donors}
              setDonors={setDonors}
              requests={requests}
              setRequests={setRequests}
              inventory={inventory}
              setInventory={setInventory}
              hospitals={hospitals}
              setHospitals={setHospitals}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

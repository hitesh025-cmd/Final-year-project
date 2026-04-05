import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type {
  Donor,
  BloodRequest,
  BloodInventoryItem,
  Hospital,
} from './types'
import { BLOOD_GROUPS, ADMIN_CREDENTIALS } from './constants'

type AdminSection =
  | 'dashboard'
  | 'donors'
  | 'requests'
  | 'inventory'
  | 'hospitals'
  | 'users'
  | 'alerts'
  | 'reports'
  | 'security'

type Props = {
  donors: Donor[]
  setDonors: React.Dispatch<React.SetStateAction<Donor[]>>
  requests: BloodRequest[]
  setRequests: React.Dispatch<React.SetStateAction<BloodRequest[]>>
  inventory: BloodInventoryItem[]
  setInventory: React.Dispatch<React.SetStateAction<BloodInventoryItem[]>>
  hospitals: Hospital[]
  setHospitals: React.Dispatch<React.SetStateAction<Hospital[]>>
}

const SECTIONS: { id: AdminSection; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'donors', label: 'Manage Donors', icon: '👥' },
  { id: 'requests', label: 'Blood Requests', icon: '🩸' },
  { id: 'inventory', label: 'Blood Inventory', icon: '📦' },
  { id: 'hospitals', label: 'Hospitals', icon: '🏥' },
  { id: 'users', label: 'User Management', icon: '🔐' },
  { id: 'alerts', label: 'Emergency Alerts', icon: '🚨' },
  { id: 'reports', label: 'Reports & Analytics', icon: '📈' },
  { id: 'security', label: 'Security & Control', icon: '🛡️' },
]

export const AdminPortal: React.FC<Props> = ({
  donors,
  setDonors,
  requests,
  setRequests,
  inventory,
  setInventory,
  hospitals,
  setHospitals,
}) => {
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = React.useState(false)
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loginError, setLoginError] = React.useState('')
  const [section, setSection] = React.useState<AdminSection>('dashboard')

  // Donors
  const [filterGroup, setFilterGroup] = React.useState('')
  const [filterCity, setFilterCity] = React.useState('')
  const [editingDonor, setEditingDonor] = React.useState<Donor | null>(null)
  const [donorForm, setDonorForm] = React.useState({
    name: '',
    bloodGroup: '',
    city: '',
    contact: '',
    lastDonationDate: '',
  })

  // Requests
  const [assigningRequestId, setAssigningRequestId] = React.useState<number | null>(null)
  const [selectedDonorId, setSelectedDonorId] = React.useState<number | null>(null)

  // Hospitals
  const [editingHospital, setEditingHospital] = React.useState<Hospital | null>(null)
  const [hospitalForm, setHospitalForm] = React.useState({
    name: '',
    city: '',
    address: '',
    contact: '',
    email: '',
  })

  // Inventory
  const [inventoryEdit, setInventoryEdit] = React.useState<Record<string, number>>({})

  // Alerts
  const [alertMessage, setAlertMessage] = React.useState('')
  const [alertSent, setAlertSent] = React.useState(false)

  // Blocked "users" (donor/hospital ids) for user management
  const [blockedIds, setBlockedIds] = React.useState<Set<number>>(new Set())

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    if (
      username === ADMIN_CREDENTIALS.username &&
      password === ADMIN_CREDENTIALS.password
    ) {
      setIsLoggedIn(true)
    } else {
      setLoginError('Invalid username or password.')
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUsername('')
    setPassword('')
    navigate('/')
  }

  const removeDonor = async (id: number) => {
    if (!window.confirm('Remove this donor?')) return
    try {
      await fetch(`/api/donors/${id}`, { method: 'DELETE' })
      setDonors(prev => prev.filter(d => d.id !== id))
    } catch (err) { alert('Error removing') }
  }

  const toggleAvailable = async (id: number) => {
    const donor = donors.find(d => d.id === id)
    if (!donor) return
    try {
      await fetch(`/api/donors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...donor, available: !donor.available })
      })
      setDonors(prev => prev.map(d => (d.id === id ? { ...d, available: !d.available } : d)))
    } catch (err) { alert('Error toggling status') }
  }

  const openEditDonor = (d: Donor) => {
    setEditingDonor(d)
    setDonorForm({
      name: d.name,
      bloodGroup: d.bloodGroup,
      city: d.city,
      contact: d.contact,
      lastDonationDate: d.lastDonationDate || '',
    })
  }

  const saveDonor = async () => {
    if (!editingDonor) return
    try {
      const data = { ...editingDonor, ...donorForm, lastDonationDate: donorForm.lastDonationDate || editingDonor.lastDonationDate }
      await fetch(`/api/donors/${editingDonor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      setDonors(prev => prev.map(d => (d.id === editingDonor.id ? data : d)))
      setEditingDonor(null)
      setDonorForm({ name: '', bloodGroup: '', city: '', contact: '', lastDonationDate: '' })
    } catch (err) { alert('Error saving') }
  }

  const addDonor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!donorForm.name || !donorForm.bloodGroup || !donorForm.city || !donorForm.contact) {
      alert('Fill required fields.')
      return
    }
    try {
      const res = await fetch('/api/donors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...donorForm, available: true })
      })
      const newDonor = await res.json()
      setDonors(prev => [...prev, newDonor])
      setDonorForm({ name: '', bloodGroup: '', city: '', contact: '', lastDonationDate: '' })
    } catch (err) { alert('Error adding') }
  }

  const approveRequest = async (id: number) => {
    try {
      await fetch(`/api/requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      })
      setRequests(prev => prev.map(r => (r.id === id ? { ...r, status: 'approved' as const } : r)))
    } catch (err) { alert('Error approving') }
  }

  const rejectRequest = async (id: number) => {
    if (!window.confirm('Reject this request?')) return
    try {
      await fetch(`/api/requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      })
      setRequests(prev => prev.map(r => (r.id === id ? { ...r, status: 'rejected' as const } : r)))
    } catch (err) { alert('Error rejecting') }
  }

  const assignDonorToRequest = async (requestId: number) => {
    if (!selectedDonorId) return
    try {
      await fetch(`/api/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'fulfilled', assignedDonorId: selectedDonorId })
      })
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, assignedDonorId: selectedDonorId, status: 'fulfilled' as const } : r))
      setAssigningRequestId(null)
      setSelectedDonorId(null)
    } catch (err) { alert('Error assigning') }
  }

  const updateInventoryUnits = async (bloodGroup: string, delta: number) => {
    const item = inventory.find(i => i.bloodGroup === bloodGroup)
    if (!item) return
    const newUnits = Math.max(0, item.units + delta)
    try {
      await fetch(`/api/inventory/${encodeURIComponent(bloodGroup)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ units: newUnits })
      })
      setInventory(prev => prev.map(i => i.bloodGroup === bloodGroup ? { ...i, units: newUnits } : i))
    } catch (err) { alert('Error updating') }
  }

  const setInventoryUnits = async (bloodGroup: string, value: number) => {
    const newUnits = Math.max(0, value)
    try {
      await fetch(`/api/inventory/${encodeURIComponent(bloodGroup)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ units: newUnits })
      })
      setInventory(prev => prev.map(i => i.bloodGroup === bloodGroup ? { ...i, units: newUnits } : i))
    } catch (err) { alert('Error setting') }
  }

  const saveHospital = async () => {
    if (editingHospital) {
      try {
        await fetch(`/api/hospitals/${editingHospital.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...editingHospital, ...hospitalForm })
        })
        setHospitals(prev => prev.map(h => h.id === editingHospital.id ? { ...h, ...hospitalForm } : h))
      } catch (err) { alert('Error updating') }
    } else {
      if (!hospitalForm.name || !hospitalForm.city || !hospitalForm.contact) {
        alert('Fill name, city, contact.')
        return
      }
      try {
        const res = await fetch('/api/hospitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...hospitalForm, address: hospitalForm.address || '', email: hospitalForm.email || '' })
        })
        const newHosp = await res.json()
        setHospitals(prev => [...prev, newHosp])
      } catch (err) { alert('Error adding') }
    }
    setEditingHospital(null)
    setHospitalForm({ name: '', city: '', address: '', contact: '', email: '' })
  }

  const removeHospital = async (id: number) => {
    if (window.confirm('Remove this hospital?')) {
      try {
        await fetch(`/api/hospitals/${id}`, { method: 'DELETE' })
        setHospitals(prev => prev.filter(h => h.id !== id))
      } catch (err) { alert('Error deleting') }
    }
  }

  const toggleUserBlock = (id: number) => {
    setBlockedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sendAlert = (e: React.FormEvent) => {
    e.preventDefault()
    setAlertSent(true)
    setAlertMessage('')
    setTimeout(() => setAlertSent(false), 3000)
  }

  const totalBloodUnits = inventory.reduce((s, i) => s + i.units, 0)
  const filteredDonors = donors.filter(d => {
    const g = filterGroup ? d.bloodGroup === filterGroup : true
    const c = filterCity ? d.city.toLowerCase().includes(filterCity.toLowerCase()) : true
    return g && c
  })

  // Derive display users from donors + hospitals; block state from blockedIds
  const displayUsers = [
    ...donors.map(d => ({ id: d.id, name: d.name, email: d.contact, role: 'donor' as const })),
    ...hospitals.map(h => ({ id: 10000 + h.id, name: h.name, email: h.email || h.contact, role: 'hospital' as const })),
  ]

  if (!isLoggedIn) {
    return (
      <div className="admin-shell">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <span className="blood-drop">🔐</span>
            <h1>Admin Portal</h1>
            <p className="muted">Sign in to manage the system</p>
          </div>
          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="field">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
                autoComplete="username"
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            {loginError && <p className="admin-login-error">{loginError}</p>}
            <button type="submit" className="primary-btn full-width">
              Sign In
            </button>
          </form>
          <Link to="/" className="admin-back-link">← Back to site</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>Admin</h2>
          <Link to="/" className="admin-link">View site</Link>
        </div>
        <nav className="admin-nav">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              type="button"
              className={`admin-nav-btn ${section === s.id ? 'active' : ''}`}
              onClick={() => setSection(s.id)}
            >
              <span className="admin-nav-icon">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button type="button" className="admin-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {section === 'dashboard' && (
          <>
            <h1 className="admin-page-title">Dashboard</h1>
            <div className="admin-stats dashboard-stats">
              <div className="admin-stat-card large">
                <span className="admin-stat-value">{donors.length}</span>
                <span className="admin-stat-label">Total Donors</span>
              </div>
              <div className="admin-stat-card large">
                <span className="admin-stat-value">{requests.length}</span>
                <span className="admin-stat-label">Blood Requests</span>
              </div>
              <div className="admin-stat-card large">
                <span className="admin-stat-value">{totalBloodUnits}</span>
                <span className="admin-stat-label">Available Blood Units</span>
              </div>
              <div className="admin-stat-card large">
                <span className="admin-stat-value">{hospitals.length}</span>
                <span className="admin-stat-label">Hospitals Registered</span>
              </div>
            </div>
            <div className="card">
              <h2>Quick stats by blood group</h2>
              <div className="admin-stats">
                {BLOOD_GROUPS.map(g => {
                  const inv = inventory.find(i => i.bloodGroup === g)
                  const count = donors.filter(d => d.bloodGroup === g && d.available).length
                  return (
                    <div key={g} className="admin-stat-card small">
                      <span className="admin-stat-value">{inv?.units ?? 0} units</span>
                      <span className="admin-stat-label">{g}</span>
                      <span className="admin-stat-sublabel">{count} donors</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {section === 'donors' && (
          <>
            <h1 className="admin-page-title">Manage Donors</h1>
            <div className="card admin-form-card">
              <h2>Add new donor</h2>
              <form className="grid-form" onSubmit={addDonor}>
                <div className="field">
                  <label>Name *</label>
                  <input
                    value={donorForm.name}
                    onChange={e => setDonorForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>
                <div className="field">
                  <label>Blood Group *</label>
                  <select
                    value={donorForm.bloodGroup}
                    onChange={e => setDonorForm(f => ({ ...f, bloodGroup: e.target.value }))}
                  >
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>City *</label>
                  <input
                    value={donorForm.city}
                    onChange={e => setDonorForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>
                <div className="field">
                  <label>Contact *</label>
                  <input
                    value={donorForm.contact}
                    onChange={e => setDonorForm(f => ({ ...f, contact: e.target.value }))}
                    placeholder="Phone"
                  />
                </div>
                <div className="field">
                  <label>Last donation</label>
                  <input
                    type="date"
                    value={donorForm.lastDonationDate}
                    onChange={e => setDonorForm(f => ({ ...f, lastDonationDate: e.target.value }))}
                  />
                </div>
                <div className="actions">
                  <button type="submit" className="primary-btn">Add Donor</button>
                </div>
              </form>
            </div>

            {editingDonor && (
              <div className="card admin-form-card admin-modal">
                <h2>Edit donor</h2>
                <div className="grid-form">
                  <div className="field">
                    <label>Name</label>
                    <input
                      value={donorForm.name}
                      onChange={e => setDonorForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label>Blood Group</label>
                    <select
                      value={donorForm.bloodGroup}
                      onChange={e => setDonorForm(f => ({ ...f, bloodGroup: e.target.value }))}
                    >
                      {BLOOD_GROUPS.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>City</label>
                    <input
                      value={donorForm.city}
                      onChange={e => setDonorForm(f => ({ ...f, city: e.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label>Contact</label>
                    <input
                      value={donorForm.contact}
                      onChange={e => setDonorForm(f => ({ ...f, contact: e.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label>Last donation</label>
                    <input
                      type="date"
                      value={donorForm.lastDonationDate}
                      onChange={e => setDonorForm(f => ({ ...f, lastDonationDate: e.target.value }))}
                    />
                  </div>
                  <div className="actions">
                    <button type="button" className="primary-btn" onClick={saveDonor}>
                      Save
                    </button>
                    <button
                      type="button"
                      className="admin-logout-btn"
                      onClick={() => {
                        setEditingDonor(null)
                        setDonorForm({ name: '', bloodGroup: '', city: '', contact: '', lastDonationDate: '' })
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <h2>Donor list</h2>
              <div className="admin-filters grid-form">
                <div className="field">
                  <label>Blood Group</label>
                  <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
                    <option value="">All</option>
                    {BLOOD_GROUPS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>City</label>
                  <input
                    value={filterCity}
                    onChange={e => setFilterCity(e.target.value)}
                    placeholder="Filter by city"
                  />
                </div>
              </div>
              {filteredDonors.length === 0 ? (
                <p className="muted">No donors.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Blood</th>
                        <th>City</th>
                        <th>Contact</th>
                        <th>Last donation</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDonors.map(d => (
                        <tr key={d.id}>
                          <td>{d.name}</td>
                          <td><span className="badge">{d.bloodGroup}</span></td>
                          <td>{d.city}</td>
                          <td>{d.contact}</td>
                          <td>{d.lastDonationDate || '—'}</td>
                          <td>
                            <button
                              type="button"
                              className={`admin-status-btn ${d.available ? 'available' : 'unavailable'}`}
                              onClick={() => toggleAvailable(d.id)}
                            >
                              {d.available ? 'Available' : 'Unavailable'}
                            </button>
                          </td>
                          <td>
                            <button type="button" className="admin-edit-btn" onClick={() => openEditDonor(d)}>
                              Edit
                            </button>
                            <button type="button" className="admin-delete-btn" onClick={() => removeDonor(d.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {section === 'requests' && (
          <>
            <h1 className="admin-page-title">Blood Requests</h1>
            <div className="card">
              <h2>Requests</h2>
              {requests.length === 0 ? (
                <p className="muted">No blood requests yet.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Blood</th>
                        <th>Hospital</th>
                        <th>Units</th>
                        <th>Urgency</th>
                        <th>Status</th>
                        <th>Assigned</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map(r => (
                        <tr key={r.id}>
                          <td>{r.patientName}</td>
                          <td><span className="badge">{r.bloodGroup}</span></td>
                          <td>{r.hospitalName}</td>
                          <td>{r.units}</td>
                          <td>{r.urgency}</td>
                          <td>
                            <span className={`request-status ${r.status}`}>{r.status}</span>
                          </td>
                          <td>
                            {r.assignedDonorId
                              ? donors.find(d => d.id === r.assignedDonorId)?.name ?? '—'
                              : '—'}
                          </td>
                          <td>
                            {r.status === 'pending' && (
                              <>
                                <button type="button" className="admin-edit-btn" onClick={() => approveRequest(r.id)}>
                                  Approve
                                </button>
                                <button type="button" className="admin-delete-btn" onClick={() => rejectRequest(r.id)}>
                                  Reject
                                </button>
                              </>
                            )}
                            {r.status === 'approved' && assigningRequestId !== r.id && (
                              <button
                                type="button"
                                className="primary-btn small"
                                onClick={() => setAssigningRequestId(r.id)}
                              >
                                Assign donor
                              </button>
                            )}
                            {assigningRequestId === r.id && (
                              <div className="admin-assign-row">
                                <select
                                  value={selectedDonorId ?? ''}
                                  onChange={e => setSelectedDonorId(Number(e.target.value) || null)}
                                >
                                  <option value="">Select donor</option>
                                  {donors
                                    .filter(d => d.bloodGroup === r.bloodGroup && d.available)
                                    .map(d => (
                                      <option key={d.id} value={d.id}>{d.name} ({d.city})</option>
                                    ))}
                                </select>
                                <button
                                  type="button"
                                  className="primary-btn small"
                                  onClick={() => assignDonorToRequest(r.id)}
                                >
                                  Assign
                                </button>
                                <button type="button" className="admin-logout-btn" onClick={() => setAssigningRequestId(null)}>
                                  Cancel
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {section === 'inventory' && (
          <>
            <h1 className="admin-page-title">Blood Inventory</h1>
            <div className="card">
              <h2>Stock by blood group</h2>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Blood Group</th>
                      <th>Units</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(item => (
                      <tr key={item.bloodGroup}>
                        <td><span className="badge">{item.bloodGroup}</span></td>
                        <td>{item.units}</td>
                        <td>
                          <button type="button" className="admin-inv-btn" onClick={() => updateInventoryUnits(item.bloodGroup, -1)}>
                            −
                          </button>
                          <button type="button" className="admin-inv-btn" onClick={() => updateInventoryUnits(item.bloodGroup, 1)}>
                            +
                          </button>
                          <input
                            type="number"
                            min={0}
                            className="admin-inv-input"
                            value={inventoryEdit[item.bloodGroup] ?? item.units}
                            onFocus={() => setInventoryEdit(prev => ({ ...prev, [item.bloodGroup]: item.units }))}
                            onChange={e => setInventoryEdit(prev => ({ ...prev, [item.bloodGroup]: parseInt(e.target.value, 10) || 0 }))}
                            onBlur={e => setInventoryUnits(item.bloodGroup, parseInt(e.target.value, 10) || 0)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {section === 'hospitals' && (
          <>
            <h1 className="admin-page-title">Hospitals / Blood Banks</h1>
            <div className="card admin-form-card">
              <h2>{editingHospital ? 'Update hospital' : 'Add hospital'}</h2>
              <div className="grid-form">
                <div className="field">
                  <label>Name *</label>
                  <input
                    value={hospitalForm.name}
                    onChange={e => setHospitalForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Hospital name"
                  />
                </div>
                <div className="field">
                  <label>City *</label>
                  <input
                    value={hospitalForm.city}
                    onChange={e => setHospitalForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>
                <div className="field">
                  <label>Address</label>
                  <input
                    value={hospitalForm.address}
                    onChange={e => setHospitalForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Address"
                  />
                </div>
                <div className="field">
                  <label>Contact *</label>
                  <input
                    value={hospitalForm.contact}
                    onChange={e => setHospitalForm(f => ({ ...f, contact: e.target.value }))}
                    placeholder="Phone"
                  />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={hospitalForm.email}
                    onChange={e => setHospitalForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="Email"
                  />
                </div>
                <div className="actions">
                  <button type="button" className="primary-btn" onClick={saveHospital}>
                    {editingHospital ? 'Update' : 'Add'}
                  </button>
                  {editingHospital && (
                    <button
                      type="button"
                      className="admin-logout-btn"
                      onClick={() => {
                        setEditingHospital(null)
                        setHospitalForm({ name: '', city: '', address: '', contact: '', email: '' })
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="card">
              <h2>Registered hospitals</h2>
              {hospitals.length === 0 ? (
                <p className="muted">No hospitals added yet.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>City</th>
                        <th>Address</th>
                        <th>Contact</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hospitals.map(h => (
                        <tr key={h.id}>
                          <td>{h.name}</td>
                          <td>{h.city}</td>
                          <td>{h.address || '—'}</td>
                          <td>{h.contact}</td>
                          <td>
                            <button type="button" className="admin-edit-btn" onClick={() => { setEditingHospital(h); setHospitalForm({ name: h.name, city: h.city, address: h.address, contact: h.contact, email: h.email }) }}>
                              Edit
                            </button>
                            <button type="button" className="admin-delete-btn" onClick={() => removeHospital(h.id)}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {section === 'users' && (
          <>
            <h1 className="admin-page-title">User Management</h1>
            <p className="muted">
              Donors and hospitals appear as system users. Block suspicious accounts or reset passwords.
            </p>
            <div className="card">
              <h2>Users</h2>
              {displayUsers.length === 0 ? (
                <p className="muted">No users (add donors or hospitals first).</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email / Contact</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayUsers.map(u => {
                        const blocked = blockedIds.has(u.id)
                        return (
                          <tr key={u.id}>
                            <td>{u.name}</td>
                            <td>{u.email}</td>
                            <td>{u.role}</td>
                            <td>{blocked ? 'Blocked' : 'Active'}</td>
                            <td>
                              <button
                                type="button"
                                className={blocked ? 'admin-status-btn available' : 'admin-status-btn unavailable'}
                                onClick={() => toggleUserBlock(u.id)}
                              >
                                {blocked ? 'Unblock' : 'Block'}
                              </button>
                              <button type="button" className="admin-edit-btn" disabled title="Not available">
                                Reset password
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {section === 'alerts' && (
          <>
            <h1 className="admin-page-title">Emergency Alerts</h1>
            <div className="card">
              <h2>Send notification</h2>
              <p className="muted">Send emergency blood request alerts to donors.</p>
              <form onSubmit={sendAlert}>
                <div className="field">
                  <label>Message</label>
                  <textarea
                    className="admin-textarea"
                    rows={4}
                    value={alertMessage}
                    onChange={e => setAlertMessage(e.target.value)}
                    placeholder="Urgent: B+ blood needed at AIIMS. Contact..."
                  />
                </div>
                <button type="submit" className="primary-btn">
                  Send alert
                </button>
              </form>
              {alertSent && <p className="admin-success">Alert sent.</p>}
            </div>
            <div className="card">
              <h3>Recent alerts</h3>
              <p className="muted">In production, list sent alerts and delivery status here.</p>
            </div>
          </>
        )}

        {section === 'reports' && (
          <>
            <h1 className="admin-page-title">Reports & Analytics</h1>
            <div className="admin-reports-grid">
              <div className="card">
                <h2>Monthly blood donation report</h2>
                <p className="muted">Summary: Total donations this month by group.</p>
                <table className="admin-table">
                  <thead>
                    <tr><th>Blood Group</th><th>Donations</th></tr>
                  </thead>
                  <tbody>
                    {BLOOD_GROUPS.map(g => (
                      <tr key={g}>
                        <td>{g}</td>
                        <td>{donors.filter(d => d.bloodGroup === g).length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card">
                <h2>Donor activity</h2>
                <p className="muted">Registered donors: {donors.length}. Available: {donors.filter(d => d.available).length}.</p>
              </div>
              <div className="card">
                <h2>Blood stock report</h2>
                <p className="muted">Total units: {totalBloodUnits}.</p>
                <ul className="admin-report-list">
                  {inventory.map(i => (
                    <li key={i.bloodGroup}>{i.bloodGroup}: {i.units} units</li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}

        {section === 'security' && (
          <>
            <h1 className="admin-page-title">Security & System Control</h1>
            <div className="card">
              <h2>System maintenance</h2>
              <p className="muted">Monitor activity, backup data, maintain database.</p>
              <div className="admin-security-actions">
                <button type="button" className="primary-btn" onClick={() => alert('Backup started.')}>
                  Backup data
                </button>
                <button type="button" className="admin-logout-btn" onClick={() => alert('Database check run.')}>
                  Run DB check
                </button>
              </div>
            </div>
            <div className="card">
              <h2>Activity log</h2>
              <p className="muted">In production, show recent admin actions and suspicious activity here.</p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

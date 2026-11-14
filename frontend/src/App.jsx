import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import api, { apiAvailable } from './services/api'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DataPage from './pages/DataPage'
import Settings from './pages/Settings'

function Guard({ user, children }) {
  return user ? children : <Navigate to="/login" replace />
}
export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const location = useLocation()
  useEffect(() => {
    if (!apiAvailable) {
      setUser(null)
      setChecking(false)
      return
    }
    setChecking(true)
    api.get('/auth/me').then(r => setUser(r.data.user)).catch(() => setUser(null)).finally(() => setChecking(false))
  }, [location.pathname])
  if (checking) return <div className="loading-screen"><div className="spinner"/>Loading Hello-Transport</div>
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={setUser}/>} />
    <Route path="/" element={<Guard user={user}><Layout user={user} onLogout={() => setUser(null)} /></Guard>}>
      <Route index element={<Dashboard/>}/>
      <Route path="vehicles" element={<DataPage type="vehicles"/>}/>
      <Route path="drivers" element={<DataPage type="drivers"/>}/>
      <Route path="trips" element={<DataPage type="trips"/>}/>
      <Route path="fuel" element={<DataPage type="fuel"/>}/>
      <Route path="finance" element={<DataPage type="finance"/>}/>
      <Route path="reports" element={<DataPage type="reports"/>}/>
      <Route path="excel" element={<DataPage type="excel"/>}/>
      <Route path="settings" element={<Settings/>}/>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>
}

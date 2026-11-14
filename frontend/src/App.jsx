import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './services/firebase'
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

  useEffect(() => onAuthStateChanged(auth, firebaseUser => {
    setUser(firebaseUser ? {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      username: firebaseUser.email
    } : null)
    setChecking(false)
  }), [])

  if (checking) return <div className="loading-screen"><div className="spinner"/>Loading TransportPro</div>
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/" replace/> : <Login/>} />
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

import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { NavLink as RouterNavLink } from 'react-router-dom'
import { LayoutDashboard, Truck, Users, Route, Fuel, Wallet, ChartNoAxesCombined, FileSpreadsheet, Settings as SettingsIcon, LogOut, Menu, Bell } from 'lucide-react'
import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../services/firebase'
const links = [
  ['Overview','/',LayoutDashboard],['Vehicles','/vehicles',Truck],['Drivers','/drivers',Users],
  ['Trips','/trips',Route],['Fuel Expenses','/fuel',Fuel],['Income & Expenses','/finance',Wallet],
  ['Reports & Analytics','/reports',ChartNoAxesCombined],['Excel Management','/excel',FileSpreadsheet],['Settings','/settings',SettingsIcon]
]
export default function Layout({user,onLogout}) {
  const [open,setOpen]=useState(false); const nav=useNavigate(); const loc=useLocation()
  const title=links.find(x=>x[1]===loc.pathname)?.[0] || 'Dashboard'
  async function logout(){await signOut(auth);onLogout();nav('/login')}
  return <div className="app-shell">
    <aside className={`sidebar ${open?'sidebar-open':''}`}>
      <div className="brand"><div className="brand-mark"><Truck size={22}/></div><div><b>TransportPro</b><small>FLEET MANAGEMENT</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{links.map(([label,path,Icon])=><NavLink key={path} to={path} end={path==='/'} onClick={()=>setOpen(false)} className={({isActive})=>`nav-link ${isActive?'active':''}`}><Icon size={18}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="admin-chip"><div className="avatar">A</div><div><b>{user?.email || 'Admin'}</b><small>Administrator</small></div></div><button className="logout-btn" onClick={logout}><LogOut size={17}/> Sign out</button></div>
    </aside>
    {open&&<div className="mobile-scrim" onClick={()=>setOpen(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn mobile-menu" onClick={()=>setOpen(!open)}><Menu/></button><div><div className="breadcrumb">WORKSPACE <span>/</span> {title.toUpperCase()}</div><h1>{title}</h1></div><div className="top-actions"><span className="online-pill"><i/> Firebase connected</span><button className="icon-btn"><Bell size={18}/></button><div className="avatar avatar-light">A</div></div></header>
      <div className="page-content"><Outlet/></div>
      <footer className="footer">© {new Date().getFullYear()} TransportPro <span>Goods Transport Management</span></footer>
    </main>
  </div>
}

import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Truck, Users, Route, Fuel, Wallet, ChartNoAxesCombined, FileSpreadsheet, Settings as SettingsIcon, LogOut, Menu, CircleHelp, PanelLeftClose, PanelLeftOpen, X, BookOpen, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../services/firebase'
const links = [
  ['Dashboard','/',LayoutDashboard],['Vehicles','/vehicles',Truck],['Drivers','/drivers',Users],
  ['Trip Management','/trips',Route],['Fuel Records','/fuel',Fuel],['Finance','/finance',Wallet],
  ['Reports','/reports',ChartNoAxesCombined],['Import / Export','/excel',FileSpreadsheet],['Settings','/settings',SettingsIcon]
]
export default function Layout({user,onLogout}) {
  const [open,setOpen]=useState(false); const [collapsed,setCollapsed]=useState(false); const [guideOpen,setGuideOpen]=useState(()=>localStorage.getItem('helloTransportGuideSeen')!=='yes'); const nav=useNavigate(); const loc=useLocation()
  const title=links.find(x=>x[1]===loc.pathname)?.[0] || 'Dashboard'
  function closeGuide(){localStorage.setItem('helloTransportGuideSeen','yes');setGuideOpen(false)}
  async function logout(){await signOut(auth);onLogout();nav('/login')}
  return <div className="app-shell">
    <aside className={`sidebar ${open?'sidebar-open':''} ${collapsed?'sidebar-collapsed':''}`}>
      <div className="brand"><div className="brand-mark"><Truck size={22}/></div><div className="brand-copy"><b>Hello Transport</b><small>FLEET MANAGEMENT</small></div><button className="sidebar-toggle" onClick={()=>setCollapsed(!collapsed)} title={collapsed?'Expand sidebar':'Collapse sidebar'} aria-label={collapsed?'Expand sidebar':'Collapse sidebar'}>{collapsed?<PanelLeftOpen size={17}/>:<PanelLeftClose size={17}/>}</button></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{links.map(([label,path,Icon])=><NavLink key={path} to={path} end={path==='/'} onClick={()=>setOpen(false)} className={({isActive})=>`nav-link ${isActive?'active':''}`}><Icon size={18}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="admin-chip"><div className="avatar">A</div><div><b>{user?.email || 'Admin'}</b><small>Administrator</small></div></div><button className="logout-btn" onClick={logout}><LogOut size={17}/> Sign out</button></div>
    </aside>
    {open&&<div className="mobile-scrim" onClick={()=>setOpen(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn mobile-menu" onClick={()=>setOpen(!open)}><Menu/></button><div><div className="breadcrumb">WORKSPACE <span>/</span> {title.toUpperCase()}</div><h1>{title}</h1></div><div className="top-actions"><span className="online-pill"><i/> Firebase connected</span><button className="icon-btn" onClick={()=>setGuideOpen(true)} title="Open getting started guide" aria-label="Open getting started guide"><CircleHelp size={18}/></button><div className="avatar avatar-light">A</div></div></header>
      <div className="page-content"><Outlet/></div>
      <footer className="footer">© {new Date().getFullYear()} Hello Transport <span>Goods Transport Management</span></footer>
      {guideOpen&&<div className="modal-backdrop guide-backdrop"><section className="modal guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title"><header><div><span className="guide-kicker"><BookOpen size={15}/> GETTING STARTED</span><h2 id="guide-title">Welcome to Hello Transport</h2><p>Follow these simple steps to manage your transport operations.</p></div><button className="icon-btn" onClick={closeGuide} aria-label="Close guide"><X/></button></header><div className="guide-steps"><div><span>1</span><section><b>Add your vehicles</b><p>Register each vehicle using its number plate and details.</p></section></div><div><span>2</span><section><b>Add your drivers</b><p>Enter driver contact details and licence information.</p></section></div><div><span>3</span><section><b>Create a trip</b><p>Choose an available vehicle and driver, then enter the route.</p></section></div><div><span>4</span><section><b>Record fuel and finances</b><p>Link fuel, income, payments and expenses to the right trip.</p></section></div><div><span>5</span><section><b>Review your dashboard</b><p>Check fleet availability, trip progress and business performance.</p></section></div></div><div className="guide-footer"><span>You can reopen this guide anytime using the help icon.</span><button className="primary-btn" onClick={closeGuide}><CheckCircle2 size={16}/> Get started</button></div></section></div>}
    </main>
  </div>
}

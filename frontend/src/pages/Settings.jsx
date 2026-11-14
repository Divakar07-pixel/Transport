import { useState } from 'react'
import { ShieldCheck, KeyRound } from 'lucide-react'
import { updatePassword } from 'firebase/auth'
import { auth } from '../services/firebase'

export default function Settings(){
 const [password,setPassword]=useState('');const [message,setMessage]=useState('');const [error,setError]=useState('')
 async function submit(e){
   e.preventDefault();setMessage('');setError('')
   try{await updatePassword(auth.currentUser,password);setMessage('Password updated successfully.');setPassword('')}
   catch(e){setError(e.code==='auth/requires-recent-login'?'Please sign out and sign in again, then retry the password change.':e.message||'Unable to update password')}
 }
 return <div className="stack-lg">
   <div className="page-intro"><h2>Settings</h2><p>Manage administrator security and application preferences.</p></div>
   <section className="panel settings-panel"><div className="settings-heading"><div className="overview-icon blue"><KeyRound/></div><div><h3>Change administrator password</h3><p>Use a unique password with at least 12 characters.</p></div></div>
   <form className="settings-form" onSubmit={submit}><label>New password<input type="password" minLength="12" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Enter a strong new password"/></label>{message&&<div className="success-box">{message}</div>}{error&&<div className="error-box">{error}</div>}<button className="primary-btn">Update password</button></form></section>
   <section className="panel settings-panel"><div className="settings-heading"><div className="overview-icon green"><ShieldCheck/></div><div><h3>Cloud data storage</h3><p>TransportPro stores vehicles, drivers, trips, fuel, income, payments and expenses in your private Firebase Firestore workspace. Excel files are used for import and export backups.</p></div></div></section>
 </div>
}

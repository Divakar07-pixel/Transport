import { useState } from 'react'
import {
  Activity, BatteryCharging, Eye, EyeOff, LockKeyhole, MapPin, ShieldCheck,
  Truck, UserRound, Wrench, Zap
} from 'lucide-react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../services/firebase'
import './Login.css'

const features = [
  { Icon: Activity, label: <>Real-time<br/>Monitoring</>, tone: 'blue' },
  { Icon: Wrench, label: <>Predictive<br/>Maintenance</>, tone: 'green' },
  { Icon: BatteryCharging, label: <>Optimized<br/>Operations</>, tone: 'purple' },
  { Icon: ShieldCheck, label: <>Secure &<br/>Reliable</>, tone: 'orange' }
]

function FleetIllustration() {
  return <div className="tp-fleet-scene" role="img" aria-label="Fleet route and live vehicle tracking illustration">
    <div className="tp-route-art">
      <div className="tp-route-grid" aria-hidden="true">
        <span/><span/><span/><span/><span/><span/>
      </div>
      <svg className="tp-route-line" viewBox="0 0 700 260" aria-hidden="true">
        <path d="M52 202C150 202 142 84 258 84s122 104 222 104 83-100 168-100" fill="none" stroke="#226dcc" strokeWidth="2" strokeDasharray="7 9"/>
        <path d="M52 202C150 202 142 84 258 84s122 104 222 104 83-100 168-100" fill="none" stroke="#58adff" strokeWidth="1" opacity=".65"/>
        <circle cx="52" cy="202" r="7" fill="#72c1ff"/>
        <circle cx="648" cy="88" r="7" fill="#72c1ff"/>
        <circle cx="52" cy="202" r="13" fill="none" stroke="#72c1ff" opacity=".35"/>
        <circle cx="648" cy="88" r="13" fill="none" stroke="#72c1ff" opacity=".35"/>
      </svg>
      <div className="tp-route-label tp-origin"><MapPin size={14}/> Dispatch</div>
      <div className="tp-route-label tp-destination"><MapPin size={14}/> Destination</div>
      <div className="tp-truck-card">
        <div className="tp-truck-icon"><Truck size={66} strokeWidth={1.35}/></div>
        <div className="tp-truck-info"><strong>Fleet on the move</strong><span>Live route visibility</span></div>
        <i/>
      </div>
      <span className="tp-scene-orb tp-orb-one"/>
      <span className="tp-scene-orb tp-orb-two"/>
    </div>
  </div>
}

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (loginError) {
      const messages = {
        'auth/invalid-credential': 'Incorrect email or password.',
        'auth/user-not-found': 'No administrator account was found for this email.',
        'auth/too-many-requests': 'Too many attempts. Please wait and try again.'
      }
      setError(messages[loginError.code] || loginError.message || 'Unable to sign in.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="tp-login">
    <section className="tp-login-showcase">
      <div className="tp-login-brand">
        <span className="tp-brand-mark"><Zap size={24} strokeWidth={2.5}/></span>
        <span><strong>TransportPro</strong><small>FLEET OPERATIONS PLATFORM</small></span>
      </div>
      <div className="tp-login-copy">
        <span className="tp-eyebrow">GOODS TRANSPORT MANAGEMENT</span>
        <h1>Powering the future<br/>of fleet operation</h1>
        <p>Real-time visibility. Smarter insights.<br/>Maximum uptime for your fleet.</p>
      </div>
      <FleetIllustration/>
      <div className="tp-feature-grid">
        {features.map(({ Icon, label, tone }) => <div className="tp-feature" key={tone}>
          <span className={`tp-feature-icon ${tone}`}><Icon size={20}/></span>
          <strong>{label}</strong>
        </div>)}
      </div>
      <span className="tp-showcase-glow" aria-hidden="true"/>
    </section>

    <section className="tp-login-side">
      <div className="tp-mobile-brand">
        <span className="tp-brand-mark"><Zap size={22} strokeWidth={2.5}/></span>
        <strong>TransportPro</strong>
      </div>
      <form className="tp-login-card" onSubmit={submit}>
        <header className="tp-form-header">
          <span className="tp-eyebrow">ADMINISTRATOR PORTAL</span>
          <h2>Welcome back</h2>
          <p>Sign in to continue to TransportPro</p>
        </header>

        

        <label className="tp-field">
          <span>Administrator email</span>
          <span className="tp-input-wrap">
            <UserRound size={17} aria-hidden="true"/>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="Enter your administrator email"
              required
            />
          </span>
        </label>

        <label className="tp-field">
          <span>Password</span>
          <span className="tp-input-wrap">
            <LockKeyhole size={17} aria-hidden="true"/>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
            <button
              className="tp-password-toggle"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
          </span>
        </label>

        {error && <div className="tp-login-error" role="alert">{error}</div>}
        <button className="tp-sign-in" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="tp-login-divider"><span>SECURE ADMIN ACCESS</span></div>
        <div className="tp-security-note"><ShieldCheck size={17}/><span>Your fleet data is protected and encrypted</span></div>
      </form>
      <footer className="tp-login-footer">© {new Date().getFullYear()} TransportPro. All rights reserved.</footer>
    </section>
  </main>
}

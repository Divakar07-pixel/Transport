import { ArrowUpRight } from 'lucide-react'
export default function StatCard({label,value,caption,Icon,tone='blue'}) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className={`stat-icon ${tone}`}><Icon size={19}/></div></div><strong>{value}</strong><div className="stat-caption"><ArrowUpRight size={14}/>{caption}</div></div>
}

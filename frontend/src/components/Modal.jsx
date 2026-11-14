import { X } from 'lucide-react'
export default function Modal({title,children,onClose}) {
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="modal"><header><div><h2>{title}</h2><p>Enter the information below</p></div><button className="icon-btn" onClick={onClose}><X/></button></header>{children}</section></div>
}

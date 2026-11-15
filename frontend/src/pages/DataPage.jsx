import { useEffect, useMemo, useState } from 'react'
import {
  Download, Edit, FileSpreadsheet, Fuel, Plus, RefreshCw, Route,
  Search, Trash2, Truck, Users, Wallet
} from 'lucide-react'
import api from '../services/api'
import Modal from '../components/Modal'
import * as XLSX from 'xlsx'

const configs = {
  vehicles: {
    title: 'Vehicle Management',
    desc: 'Manage your fleet, vehicle details and availability.',
    endpoint: '/vehicles',
    icon: Truck,
    idField: 'Vehicle_ID',
    columns: ['Vehicle_ID', 'Registration_No', 'Vehicle_Type', 'Model', 'Capacity_Tons', 'Status'],
    fields: [
      ['Registration_No', 'Registration number', 'text', true],
      ['Vehicle_Type', 'Vehicle type', 'text', true],
      ['Model', 'Model', 'text'],
      ['Capacity_Tons', 'Capacity (tons)', 'number'],
      ['Status', 'Status', 'select', ['Available', 'On Trip', 'Maintenance', 'Inactive']],
      ['Notes', 'Notes', 'text']
    ]
  },
  drivers: {
    title: 'Driver Management',
    desc: 'Manage driver profiles, licence information and availability.',
    endpoint: '/drivers',
    icon: Users,
    idField: 'Driver_ID',
    columns: ['Driver_ID', 'Name', 'Phone', 'Licence_No', 'Licence_Expiry', 'Employment_Status', 'Availability'],
    fields: [
      ['Name', 'Driver name', 'text', true],
      ['Phone', 'Mobile number', 'tel', true],
      ['Licence_No', 'Licence number', 'text'],
      ['Licence_Expiry', 'Licence expiry', 'date'],
      ['Employment_Status', 'Employment status', 'select', ['Active', 'Inactive']],
      ['Availability', 'Availability', 'select', ['Available', 'On Trip', 'Unavailable', 'Inactive']],
      ['Assigned_Vehicle_ID', 'Assigned vehicle ID', 'text']
    ]
  },
  trips: {
    title: 'Trip Management',
    desc: 'Plan goods movement and monitor each delivery.',
    endpoint: '/trips',
    icon: Route,
    columns: ['Trip_ID', 'Vehicle_ID', 'Driver_ID', 'Trip_Date', 'From_Location', 'To_Location', 'Status'],
    fields: [
      ['Vehicle_ID', 'Vehicle ID', 'text', true],
      ['Driver_ID', 'Driver ID', 'text', true],
      ['Customer', 'Customer', 'text'],
      ['Goods_Description', 'Goods description', 'text'],
      ['From_Location', 'From location', 'text', true],
      ['To_Location', 'To location', 'text', true],
      ['Trip_Date', 'Trip date', 'date', true],
      ['Start_Time', 'Start time', 'time'],
      ['Expected_Delivery', 'Expected delivery', 'date'],
      ['Distance_KM', 'Distance (KM)', 'number'],
      ['Status', 'Trip status', 'select', ['Scheduled', 'In Progress', 'Completed', 'Delayed', 'Cancelled']],
      ['Notes', 'Notes', 'text']
    ]
  },
  fuel: {
    title: 'Fuel Expenses',
    desc: 'Record petrol and diesel consumption by vehicle and trip.',
    endpoint: '/fuel',
    icon: Fuel,
    idField: 'Fuel_ID',
    columns: ['Fuel_ID', 'Fuel_Date', 'Vehicle_ID', 'Driver_ID', 'Trip_ID', 'Fuel_Type', 'Litres', 'Rate_Per_Litre', 'Amount', 'Odometer_KM'],
    fields: [
      ['Vehicle_ID', 'Vehicle', 'vehicle-select', true],
      ['Trip_ID', 'Trip ID (optional)', 'text'],
      ['Driver_ID', 'Driver', 'driver-select'],
      ['Fuel_Date', 'Fuel date', 'date', true],
      ['Fuel_Type', 'Fuel type', 'select', ['Diesel', 'Petrol'], true],
      ['Entry_Mode', 'Fuel entry method', 'select', ['By litres', 'By amount'], true],
      ['Litres', 'Litres', 'number'],
      ['Rate_Per_Litre', 'Rate per litre (₹)', 'number'],
      ['Amount', 'Fuel amount (₹)', 'number'],
      ['Odometer_KM', 'Odometer (KM)', 'number'],
      ['Pump_Name', 'Fuel station', 'text'],
      ['Receipt_Ref', 'Receipt reference', 'text']
    ]
  },
  finance: {
    title: 'Income & Expenses',
    desc: 'Record trip freight, payments and operating expenses.',
    endpoint: '/income',
    icon: Wallet,
    fields: []
  }
}

const financeFields = {
  income: [
    ['Trip_ID', 'Trip ID', 'text', true],
    ['Customer', 'Customer', 'text'],
    ['Freight_Amount', 'Freight amount', 'number', true],
    ['Additional_Charges', 'Additional charges', 'number']
  ],
  payment: [
    ['Trip_ID', 'Trip ID', 'text', true],
    ['Payment_Date', 'Payment date', 'date', true],
    ['Amount', 'Amount', 'number', true],
    ['Payment_Mode', 'Payment mode', 'select', ['Cash', 'Bank Transfer', 'UPI', 'Cheque'], true],
    ['Reference', 'Reference', 'text']
  ],
  expense: [
    ['Trip_ID', 'Trip ID', 'text', true],
    ['Expense_Date', 'Expense date', 'date', true],
    ['Category', 'Category', 'select', ['Toll', 'Driver Allowance', 'Loading/Unloading', 'Parking', 'Repair', 'Other'], true],
    ['Amount', 'Amount', 'number', true],
    ['Description', 'Description', 'text']
  ]
}

const labelFor = type => type === 'fuel' ? 'fuel entry' : type === 'trips' ? 'trip' : type.slice(0, -1)

export default function DataPage({ type }) {
  const [rows, setRows] = useState([])
  const [extra, setExtra] = useState({})
  const [lookups, setLookups] = useState({ vehicles: [], drivers: [] })
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [kind, setKind] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const config = configs[type]

  async function load() {
    if (type === 'excel') return
    setError('')
    try {
      if (type === 'reports') {
        const response = await api.get('/reports')
        setExtra(response.data)
        setRows(response.data.trips || [])
      } else if (type === 'finance') {
        const [income, expenses] = await Promise.all([api.get('/income'), api.get('/expenses')])
        setExtra({ payments: await api.get('/payments').then(r => r.data), expenses: expenses.data })
        setRows(income.data)
      } else {
        const response = await api.get(config.endpoint)
        setRows(response.data)
        if (type === 'fuel') {
          const [vehicles, drivers] = await Promise.all([api.get('/vehicles'), api.get('/drivers')])
          setLookups({ vehicles: vehicles.data, drivers: drivers.data })
        }
      }
    } catch (loadError) {
      setError(loadError.code ? `${loadError.code}: ${loadError.message}` : (loadError.message || 'Unable to load records'))
    }
  }

  useEffect(() => {
    load()
  }, [type])

  const filtered = useMemo(
    () => rows.filter(row => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  )

  function openForm(formKind, record = null) {
    setKind(formKind)
    setEditing(record)
    setForm(record ? { ...record } : {})
    setError('')
    setModal(true)
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      let endpoint = config.endpoint
      if (kind === 'income') endpoint = '/income'
      if (kind === 'payment') endpoint = '/payments'
      if (kind === 'expense') endpoint = '/expenses'
      if (editing) {
        await api.put(`${endpoint}/${editing[config.idField]}`, form)
      } else {
        await api.post(endpoint, type === 'fuel' ? {
          ...form,
          Registration_No: form.Vehicle_ID ? lookups.vehicles.find(item => item.Vehicle_ID === form.Vehicle_ID)?.Registration_No || '' : '',
          Driver_Name: form.Driver_ID ? lookups.drivers.find(item => item.Driver_ID === form.Driver_ID)?.Name || '' : '',
          ...(form.Entry_Mode === 'By litres' ? { Amount: Number(form.Litres || 0) * Number(form.Rate_Per_Litre || 0) } : { Litres: '', Rate_Per_Litre: '' })
        } : form)
      }
      setModal(false)
      await load()
    } catch (submitError) {
      setError(submitError.code ? `${submitError.code}: ${submitError.message}` : (submitError.message || 'Could not save record'))
    } finally {
      setBusy(false)
    }
  }

  async function deleteRecord(record) {
    const id = record[config.idField]
    if (!window.confirm(`Delete ${labelFor(type)} ${id}? This cannot be undone.`)) return
    setError('')
    try {
      await api.delete(`${config.endpoint}/${id}`)
      await load()
    } catch (deleteError) {
      setError(deleteError.code ? `${deleteError.code}: ${deleteError.message}` : (deleteError.message || 'Could not delete record'))
    }
  }

  async function exportBook() {
    try {
      const definitions = [
        ['Vehicles', '/vehicles'], ['Drivers', '/drivers'], ['Trips', '/trips'],
        ['Fuel_Expenses', '/fuel'], ['Trip_Income', '/income'],
        ['Payments', '/payments'], ['Other_Expenses', '/expenses']
      ]
      const workbook = XLSX.utils.book_new()
      for (const [sheet, endpoint] of definitions) {
        const result = await api.get(endpoint)
        const records = result.data.map(({ _docId, _createdAt, ...record }) => record)
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(records), sheet)
      }
      XLSX.writeFile(workbook, 'Transport_Management.xlsx')
      setError('')
    } catch (exportError) {
      setError(exportError.message || 'Excel download failed')
    }
  }

  async function importBook(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!window.confirm('Import these Excel rows into your Firebase workspace? Existing records will not be deleted.')) {
      event.target.value = ''
      return
    }
    setBusy(true)
    setError('')
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })
      const definitions = [
        ['Vehicles', '/vehicles'], ['Drivers', '/drivers'], ['Trips', '/trips'],
        ['Fuel_Expenses', '/fuel'], ['Trip_Income', '/income'],
        ['Payments', '/payments'], ['Other_Expenses', '/expenses']
      ]
      let imported = 0
      for (const [sheet, endpoint] of definitions) {
        if (!workbook.Sheets[sheet]) continue
        const records = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: '' })
        for (const record of records) {
          Object.keys(record).forEach(key => {
            if (record[key] instanceof Date) record[key] = record[key].toISOString().slice(0, 10)
          })
          await api.post(endpoint, record)
          imported += 1
        }
      }
      setError(`Imported ${imported} records into Firebase. Refresh the relevant pages to view them.`)
    } catch (importError) {
      setError(importError.message || 'Excel import failed')
    } finally {
      setBusy(false)
      event.target.value = ''
    }
  }

  if (type === 'excel') {
    return <div className="stack-lg">
      <div className="page-intro"><h2>Excel Management</h2><p>Firebase Firestore is your primary cloud record store. Use Excel to import or export workbook backups.</p></div>
      <div className="panel excel-card">
        <FileSpreadsheet size={42} color="#16834a"/><h3>Transport_Management.xlsx</h3>
        <p>Export your vehicles, drivers, trips, fuel, income, payments and expenses from Firebase into one workbook.</p>
        <button className="primary-btn" onClick={exportBook}><Download size={17}/> Download Excel workbook</button>
        <label className="secondary-btn" style={{display:'inline-flex',alignItems:'center',gap:8,cursor:'pointer',marginTop:12}}>
          <FileSpreadsheet size={16}/> Import Excel workbook
          <input type="file" accept=".xlsx,.xls" onChange={importBook} disabled={busy} style={{display:'none'}}/>
        </label>
        {busy && <p className="muted">Importing records…</p>}
        {error && <p className="muted">{error}</p>}
      </div>
    </div>
  }
  if (type === 'reports') {
    return <div className="stack-lg">
      <div className="page-intro"><h2>Reports & Analytics</h2><p>Review operational records and export your source workbook.</p></div>
      <div className="stats-grid">
        <div className="stat-card"><span>Trips recorded</span><strong>{extra.trips?.length || 0}</strong></div>
        <div className="stat-card"><span>Fuel entries</span><strong>{extra.fuel?.length || 0}</strong></div>
        <div className="stat-card"><span>Income entries</span><strong>{extra.income?.length || 0}</strong></div>
        <div className="stat-card"><span>Payments</span><strong>{extra.payments?.length || 0}</strong></div>
      </div>
      {error && <div className="error-box">{error}</div>}
      <Records rows={filtered} search={search} setSearch={setSearch} title="Trip report" exportBook={exportBook}/>
    </div>
  }

  if (type === 'finance') {
    return <div className="stack-lg">
      <div className="page-intro"><h2>Income & Expenses</h2><p>Manage freight income, advance payments, balances and trip costs.</p></div>
      <div className="action-row">
        <button className="primary-btn" onClick={() => openForm('income')}><Plus size={17}/> Add trip income</button>
        <button className="secondary-btn" onClick={() => openForm('payment')}><Plus size={17}/> Record payment</button>
        <button className="secondary-btn" onClick={() => openForm('expense')}><Plus size={17}/> Add expense</button>
        <button className="secondary-btn" onClick={load}><RefreshCw size={16}/> Refresh</button>
      </div>
      {error && <div className="error-box">{error}</div>}
      <Records rows={filtered} search={search} setSearch={setSearch} title="Trip income" columns={['Income_ID', 'Trip_ID', 'Customer', 'Freight_Amount', 'Additional_Charges']}/>
      <Records rows={extra.payments || []} search={search} setSearch={setSearch} title="Payments received" columns={['Payment_ID', 'Trip_ID', 'Payment_Date', 'Amount', 'Payment_Mode']}/>
      <Records rows={extra.expenses || []} search={search} setSearch={setSearch} title="Other expenses" columns={['Expense_ID', 'Trip_ID', 'Expense_Date', 'Category', 'Amount']}/>
      {modal && <RecordModal title={`Add ${kind}`} onClose={() => setModal(false)} fields={financeFields[kind]} form={form} setForm={setForm} error={error} busy={busy} lookups={lookups} onSubmit={submit}/>}
    </div>
  }

  const canEdit = ['vehicles', 'drivers', 'fuel'].includes(type)
  return <div className="stack-lg">
    <div className="page-intro"><h2>{config.title}</h2><p>{config.desc}</p></div>
    <div className="action-row">
      <button className="primary-btn" onClick={() => openForm(type)}><Plus size={17}/> Add {labelFor(type)}</button>
      <button className="secondary-btn" onClick={load}><RefreshCw size={16}/> Refresh</button>
    </div>
    {error && <div className="error-box">{error}</div>}
    <Records
      rows={filtered}
      search={search}
      setSearch={setSearch}
      title={`All ${config.title.toLowerCase()} records`}
      columns={config.columns}
      onEdit={canEdit ? record => openForm(type, record) : undefined}
      onDelete={canEdit ? deleteRecord : undefined}
    />
    {modal && <RecordModal
      title={`${editing ? 'Edit' : 'Add'} ${labelFor(type)}`}
      onClose={() => setModal(false)}
      fields={config.fields}
      form={form}
      setForm={setForm}
      error={error}
      busy={busy}
      lookups={lookups}
      onSubmit={submit}
    />}
  </div>
}

function RecordModal({ title, onClose, fields, form, setForm, error, busy, onSubmit, lookups = { vehicles: [], drivers: [] } }) {
  return <Modal title={title} onClose={onClose}>
    <form className="form-grid" onSubmit={onSubmit}>
      {fields.map(([key, label, type, options, required]) => (
        <label key={key}>{label}
          {type === 'vehicle-select'
            ? <select required={!!required} value={form[key] ?? ''} onChange={event => setForm({ ...form, [key]: event.target.value })}>
                <option value="">Select vehicle</option>
                {lookups.vehicles.map(vehicle => <option key={vehicle.Vehicle_ID} value={vehicle.Vehicle_ID}>{vehicle.Registration_No} — ID {vehicle.Vehicle_ID}</option>)}
              </select>
            : type === 'driver-select'
            ? <select required={!!required} value={form[key] ?? ''} onChange={event => setForm({ ...form, [key]: event.target.value })}>
                <option value="">Select driver</option>
                {lookups.drivers.map(driver => <option key={driver.Driver_ID} value={driver.Driver_ID}>{driver.Name} — ID {driver.Driver_ID}</option>)}
              </select>
            : type === 'select'
            ? <select required={!!required} value={form[key] ?? ''} onChange={event => setForm({ ...form, [key]: event.target.value })}>
                <option value="">Select</option>
                {options.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            : key === 'Litres' && form.Entry_Mode === 'By amount'
            ? null
            : (key === 'Rate_Per_Litre' && form.Entry_Mode === 'By amount')
            ? null
            : (key === 'Amount' && form.Entry_Mode === 'By litres')
            ? <input type="number" value={Number(form.Litres || 0) * Number(form.Rate_Per_Litre || 0)} readOnly aria-label="Calculated fuel amount"/>
            : <input
                required={!!required}
                type={type}
                value={form[key] ?? ''}
                onChange={event => setForm({ ...form, [key]: key === 'Registration_No' ? event.target.value.toUpperCase() : event.target.value })}
              />}
        </label>
      ))}
      {error && <div className="error-box form-full">{error}</div>}
      <button className="primary-btn form-full" disabled={busy}>{busy ? 'Saving…' : 'Save record'}</button>
    </form>
  </Modal>
}

function Records({ rows, search, setSearch, title, columns, exportBook, onEdit, onDelete }) {
  const cols = columns || (rows[0] ? Object.keys(rows[0]).filter(key => !['Created_At', 'Notes'].includes(key)).slice(0, 7) : [])
  const hasActions = onEdit || onDelete
  return <section className="panel">
    <div className="panel-heading">
      <div><h3>{title}</h3><p>{rows.length} records</p></div>
      <div className="table-actions">
        <div className="search-box"><Search size={16}/><input placeholder="Search records…" value={search} onChange={event => setSearch(event.target.value)}/></div>
        {exportBook && <button className="icon-btn" onClick={exportBook} title="Export Excel"><Download size={17}/></button>}
      </div>
    </div>
    <div className="table-wrap">
      <table>
        <thead><tr>{cols.map(column => <th key={column}>{column.replaceAll('_', ' ').toUpperCase()}</th>)}{hasActions && <th>ACTIONS</th>}</tr></thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={row.Vehicle_ID || row.Driver_ID || row.Fuel_ID || row.Trip_ID || row.Income_ID || index}>
              {cols.map(column => <td key={column}>{row[column] ?? '—'}</td>)}
              {hasActions && <td className="record-actions">
                {onEdit && <button className="icon-btn" title="Edit record" aria-label="Edit record" onClick={() => onEdit(row)}><Edit size={15}/></button>}
                {onDelete && <button className="icon-btn delete-btn" title="Delete record" aria-label="Delete record" onClick={() => onDelete(row)}><Trash2 size={15}/></button>}
              </td>}
            </tr>
          )) : <tr><td className="empty-cell" colSpan={Math.max(cols.length + (hasActions ? 1 : 0), 1)}>No records yet. Add your first record to get started.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>
}

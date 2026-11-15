import { auth, db } from './firebase'
import {
  addDoc, collection, deleteDoc, doc, getDocs, updateDoc, serverTimestamp
} from 'firebase/firestore'

const endpointCollections = {
  '/vehicles': ['vehicles', 'Vehicle_ID', 'VEH'],
  '/drivers': ['drivers', 'Driver_ID', 'DRV'],
  '/trips': ['trips', 'Trip_ID', 'TRP'],
  '/fuel': ['fuel', 'Fuel_ID', 'FUL'],
  '/income': ['income', 'Income_ID', 'INC'],
  '/payments': ['payments', 'Payment_ID', 'PAY'],
  '/expenses': ['expenses', 'Expense_ID', 'EXP']
}
const currentUid = () => {
  if (!auth.currentUser) throw new Error('Please sign in again to access your workspace.')
  return auth.currentUser.uid
}
const userCollection = name => collection(db, 'users', currentUid(), name)
const makeId = prefix => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
const makeFourDigitId = async (collectionName, idField) => {
  const existing = await rows(collectionName)
  const used = new Set(existing.map(item => String(item[idField] || '')))
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = String(Math.floor(1000 + Math.random() * 9000))
    if (!used.has(candidate)) return candidate
  }
  throw new Error(`Could not generate a unique four-digit ID for ${collectionName}. Please try again.`)
}
const rows = async name => {
  const snapshot = await getDocs(userCollection(name))
  return snapshot.docs.map(item => ({ ...item.data(), _docId: item.id }))
}
const response = data => ({ data })

async function get(url) {
  const [path] = url.split('?')
  if (endpointCollections[path]) {
    const [name] = endpointCollections[path]
    return response(await rows(name))
  }
  if (path === '/reports') {
    const [trips, fuel, income, payments, expenses] = await Promise.all(['trips','fuel','income','payments','expenses'].map(rows))
    return response({ trips, fuel, income, payments, expenses })
  }
  if (path === '/dashboard') {
    const [vehicles, drivers, trips, fuel, income, expenses] = await Promise.all(['vehicles','drivers','trips','fuel','income','expenses'].map(rows))
    const completed = trips.filter(x => x.Status === 'Completed')
    const sum = (list, key) => list.reduce((total, item) => total + Number(item[key] || 0), 0)
    const revenue = sum(income, 'Freight_Amount') + sum(income, 'Additional_Charges')
    const fuelExpenses = sum(fuel, 'Amount')
    const otherExpenses = sum(expenses, 'Amount')
    return response({
      total_vehicles: vehicles.length,
      available_vehicles: vehicles.filter(x => x.Status === 'Available').length,
      total_drivers: drivers.length,
      available_drivers: drivers.filter(x => x.Availability === 'Available').length,
      total_trips: trips.length,
      active_trips: trips.filter(x => ['Scheduled','In Progress'].includes(x.Status)).length,
      fuel_expenses: fuelExpenses,
      revenue,
      trip_expenses: fuelExpenses + otherExpenses,
      trip_profit: revenue - fuelExpenses - otherExpenses,
      completed_trips: completed.length
    })
  }
  throw new Error(`Unsupported Firebase data request: ${path}`)
}

async function post(url, payload = {}) {
  const [path] = url.split('?')
  if (path === '/backup') return response({ success: true })
  const config = endpointCollections[path]
  if (!config) throw new Error(`Unsupported Firebase create request: ${path}`)
  const [name, idField, prefix] = config
  const id = payload[idField] || (['vehicles', 'drivers'].includes(name) ? await makeFourDigitId(name, idField) : makeId(prefix))
  const record = { ...payload, [idField]: id, Created_At: payload.Created_At || new Date().toISOString(), _createdAt: serverTimestamp() }
  await addDoc(userCollection(name), record)
  const { _createdAt, ...safeRecord } = record
  return response(safeRecord)
}

async function put(url, payload = {}) {
  const match = url.match(/^(.*)\/([^/]+)$/)
  const config = match && endpointCollections[match[1]]
  if (!config) throw new Error('Unsupported Firebase update request')
  const [name, idField] = config
  const all = await getDocs(userCollection(name))
  const target = all.docs.find(item => item.data()[idField] === match[2] || item.id === match[2])
  if (!target) throw new Error('Record not found')
  await updateDoc(doc(db, 'users', currentUid(), name, target.id), { ...payload, Updated_At: new Date().toISOString() })
  return response({ ...payload, [idField]: match[2] })
}

async function del(url) {
  const match = url.match(/^(.*)\/([^/]+)$/)
  const config = match && endpointCollections[match[1]]
  if (!config) throw new Error('Unsupported Firebase delete request')
  const [name, idField] = config
  const all = await getDocs(userCollection(name))
  const target = all.docs.find(item => item.data()[idField] === match[2] || item.id === match[2])
  if (!target) throw new Error('Record not found')
  await deleteDoc(doc(db, 'users', currentUid(), name, target.id))
  return response({ success: true })
}

const api = { get, post, put, delete: del }
export default api

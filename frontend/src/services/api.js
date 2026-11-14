import axios from 'axios'
const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname)
const apiUrl = import.meta.env.VITE_API_URL || (isLocalDevelopment ? 'http://127.0.0.1:5000/api' : '')
export const apiAvailable = Boolean(apiUrl)

const api = axios.create({
  baseURL: apiUrl || undefined,
  withCredentials: apiAvailable,
  headers: { 'Content-Type': 'application/json' }
})
export default api

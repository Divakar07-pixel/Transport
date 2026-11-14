import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDdUAY22fFeC02y91Z_9XhxWl9yIxNevH4',
  authDomain: 'transport-7e687.firebaseapp.com',
  projectId: 'transport-7e687',
  storageBucket: 'transport-7e687.firebasestorage.app',
  messagingSenderId: '849543599732',
  appId: '1:849543599732:web:be896c92fb0622e112e321',
  measurementId: 'G-730KMCSGWM'
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app

import React from 'react'
import ReactDOM from 'react-dom/client'
import AppRouter from './app/AppRouter.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import './firebase.ts'
import 'bootstrap/dist/css/bootstrap.rtl.min.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </React.StrictMode>
)

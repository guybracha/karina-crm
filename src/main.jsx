import React from 'react'
import ReactDOM from 'react-dom/client'
import AppRouter from './app/AppRouter.jsx'
import './firebase.ts'
import 'bootstrap/dist/css/bootstrap.rtl.min.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
)

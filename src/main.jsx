import React from 'react'
import ReactDOM from 'react-dom/client'
import AppRouter from './app/AppRouter.jsx'
import 'bootstrap/dist/css/bootstrap.min.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
)

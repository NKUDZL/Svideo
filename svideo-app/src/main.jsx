import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// 关键修复：必须引入 index.css，否则 Tailwind 样式无法生效
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
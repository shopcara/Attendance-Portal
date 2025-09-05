import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import './index.css'
import AttendancePortal from "./AttendancePortal";
import AttendanceManager from './AttendanceManager'

function App() {
  const [count, setCount] = useState(0)

  return (
    <Router>
      <div>
        {/* Optional: Navigation Header */}
        <nav className="bg-white shadow-sm py-4 px-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-500 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Attendance System</h1>
          </div>
          <div className="flex space-x-4">
            <Link 
              to="/" 
              className="px-4 py-2 text-slate-700 hover:text-indigo-600 font-medium rounded-lg transition-colors"
            >
              Portal
            </Link>
            <Link 
              to="/manage" 
              className="px-4 py-2 text-slate-700 hover:text-indigo-600 font-medium rounded-lg transition-colors"
            >
              Management
            </Link>
          </div>
        </nav>

        {/* Main Content with Routes */}
        <Routes>
          <Route path="/" element={<AttendancePortal />} />
          <Route path="/manage" element={<AttendanceManager />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

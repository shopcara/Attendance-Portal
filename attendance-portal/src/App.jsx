import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import './index.css'
import AttendancePortal from "./AttendancePortal";

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <AttendancePortal />
    </>
  )
}

export default App

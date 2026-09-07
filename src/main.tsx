import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import './App.css'
import AtlasRouter from './world/AtlasRouter'

createRoot(document.getElementById('root')!).render(<StrictMode><AtlasRouter /></StrictMode>)

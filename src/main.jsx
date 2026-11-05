import { testSupabase } from "./lib/testSupabase";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("Publishable key loaded:", !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
testSupabase();
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

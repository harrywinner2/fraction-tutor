import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// No StrictMode: its dev-only double mount/unmount makes Framer Motion
// components flash through their hidden initial state, which looked like
// real bugs in testing. Production never ran StrictMode anyway.
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)

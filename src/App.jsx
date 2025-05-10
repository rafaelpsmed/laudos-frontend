// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.jsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App

import react from 'react'
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoutes';
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';

// Páginas
import ModeloLaudo from './pages/ModeloLaudo';
import Frases from './pages/Frases';
import Variaveis from './pages/Variaveis';
import Laudos from './pages/Laudos';

// Estilos
import '@mantine/core/styles.css';
import '@mantine/tiptap/styles.css';  

function Logout() {
  localStorage.clear();
  return <Navigate to="/login" />;
}

function RegisterAndLogout() {
  localStorage.clear();
  return <Register />;
}

function App() {
  return (
    <MantineProvider>
      <Routes>
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />

        <Route path="/modelos" element={
          <ProtectedRoute>
            <ModeloLaudo />
          </ProtectedRoute>
        } />

        <Route path="/frases" element={
          <ProtectedRoute>
            <Frases />
          </ProtectedRoute>
        } />

        <Route path="/variaveis" element={
          <ProtectedRoute>
            <Variaveis />
          </ProtectedRoute>
        } />

        <Route path="/laudos" element={
          <ProtectedRoute>
            <Laudos />
          </ProtectedRoute>
        } />

        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/register" element={<RegisterAndLogout />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MantineProvider>
  );
}

export default App;

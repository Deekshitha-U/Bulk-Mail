import { Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './store.jsx';
import Landing from './site/Landing.jsx';
import { Login, Signup, Verify } from './site/Auth.jsx';
import Dashboard from './dash/Dashboard.jsx';

function Guard({ children }) {
  const { admin } = useApp();
  return admin ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return <AppProvider>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/app/*" element={<Guard><Dashboard /></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AppProvider>;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ToastHost } from './components/ui.jsx';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);
const readJSON = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };

export function AppProvider({ children }) {
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem('pulsepost_token'); const admin = readJSON('pulsepost_admin');
    return token && admin ? { token, admin } : null;
  });
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t.slice(-3), { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4600);
  }, []);

  const setAdmin = useCallback(admin => {
    try { localStorage.setItem('pulsepost_admin', JSON.stringify(admin)); } catch {}
    setSession(s => s && { ...s, admin });
  }, []);
  const login = useCallback(data => {
    try {
      localStorage.setItem('pulsepost_token', data.token); localStorage.setItem('pulsepost_admin', JSON.stringify(data.admin));
      sessionStorage.setItem('pulsepost_boot', '1'); // show the "Getting things ready" loader once per sign-in
      sessionStorage.removeItem('pulsepost_phone_skip');
    } catch {}
    setSession({ token: data.token, admin: data.admin });
  }, []);
  const logout = useCallback(() => {
    try { localStorage.removeItem('pulsepost_token'); localStorage.removeItem('pulsepost_admin'); } catch {}
    setSession(null);
  }, []);

  useEffect(() => {
    const expired = () => { logout(); toast('Your session expired. Please sign in again.', 'info'); };
    window.addEventListener('pulsepost:unauthorized', expired);
    return () => window.removeEventListener('pulsepost:unauthorized', expired);
  }, [logout, toast]);

  const value = useMemo(() => ({ session, admin: session?.admin, login, logout, setAdmin, toast }), [session, login, logout, setAdmin, toast]);
  return <Ctx.Provider value={value}>{children}<ToastHost toasts={toasts} dismiss={id => setToasts(t => t.filter(x => x.id !== id))} /></Ctx.Provider>;
}

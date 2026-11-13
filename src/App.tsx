import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PortalLauncher } from './apps/PortalLauncher';
import { RiderApp } from './apps/RiderApp';
import { DriverApp } from './apps/DriverApp';
import { AdminApp } from './apps/AdminApp';
import { ToastContainer, ToastMessage } from './components/ToastContainer';

export default function App() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<PortalLauncher />} />
        <Route path="/rider/*" element={<RiderApp onNotify={notify} />} />
        <Route path="/driver/*" element={<DriverApp onNotify={notify} />} />
        <Route path="/admin/*" element={<AdminApp onNotify={notify} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </Router>
  );
}

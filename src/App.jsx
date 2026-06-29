import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AddLead from './pages/AddLead';
import Dispatch from './pages/Dispatch';
import Settings from './pages/Settings';

import ProtectedRoute from './components/ProtectedRoute';


function App() {
  useEffect(() => {
    if (!localStorage.getItem('pcb_users')) {
      localStorage.setItem('pcb_users', JSON.stringify([
        { id: 'admin', name: 'Admin User', password: 'admin123', role: 'ADMIN', accessPages: [] },
        { id: 'user', name: 'Employee 1', password: 'user123', role: 'USER', accessPages: [] }
      ]));
    }
    if (!localStorage.getItem('pcb_settings')) {
      localStorage.setItem('pcb_settings', JSON.stringify({
        groupHeads: ['IT', 'HR', 'Finance', 'Operations', 'Marketing'],
        paymentModes: ['Cash', 'Cheque', 'Bank Transfer', 'Online Payment'],
        lastSerialNumber: 0
      }));
    }
    if (!localStorage.getItem('pcb_credits')) localStorage.setItem('pcb_credits', JSON.stringify([]));
    if (!localStorage.getItem('pcb_expenses')) localStorage.setItem('pcb_expenses', JSON.stringify([]));
    if (!localStorage.getItem('pcb_ledger')) localStorage.setItem('pcb_ledger', JSON.stringify([]));
    if (!localStorage.getItem('pcb_leads')) localStorage.setItem('pcb_leads', JSON.stringify([]));
  }, []);

  return (
    <div className="gradient-bg min-h-screen">
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="add-lead" element={<AddLead />} />
            <Route path="dispatch" element={<Dispatch />} />
            <Route path="settings" element={<Settings />} />

          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
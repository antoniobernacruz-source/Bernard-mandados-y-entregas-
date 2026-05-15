/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthProvider, useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import Landing from './components/Landing';
import ClientDashboard from './components/ClientDashboard';
import DriverDashboard from './components/DriverDashboard';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4 shadow-lg"></div>
          <p className="text-gray-500 font-medium tracking-tight">Cargando BERNARD...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          {!user ? (
            <>
              <Route path="/" element={<Landing />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route 
                path="/dashboard" 
                element={user.role === 'driver' ? <DriverDashboard /> : <ClientDashboard />} 
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </>
          )}
        </Routes>
      </main>
      <footer className="border-t border-gray-200 py-8 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <p>© 2026 BERNARD - Huajuapan de León, Oaxaca.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-indigo-600 transition-colors">Soporte</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Términos</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacidad</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

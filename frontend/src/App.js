import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'react-datepicker/dist/react-datepicker.css';

import { LanguageProvider } from './utils/translations';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { RegionProvider } from './contexts/RegionContext';
import AuthWrapper from './components/AuthWrapper';
import Navigation from './components/Navigation';
import GlobalModals from './components/GlobalModals';
import DeploymentStatus from './components/DeploymentStatus';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Administrator from './pages/Administrator';
import Tickets from './pages/Tickets';
import Absences from './pages/Absences';
import Skills from './pages/Skills';
import Maps from './pages/Maps';
import Logs from './pages/Logs';

function MainContent() {
  const location = useLocation();
  const isCalendarPage = location.pathname === '/calendar';
  const isMapsPage = location.pathname === '/maps';

  // Use full width for Calendar and Maps pages
  const contentClass = (isCalendarPage || isMapsPage) ? 'main-content calendar-wrapper' : 'main-content';

  return (
    <main className={contentClass}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/administrator" element={<Administrator />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/absences" element={<Absences />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/maps" element={<Maps />} />
        <Route path="/logs" element={<Logs />} />
      </Routes>
    </main>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AdminProvider>
          <RegionProvider>
            <Router>
              <div className="App">
                <AuthWrapper>
                  <Navigation />
                  <GlobalModals />
                  <DeploymentStatus />
                  <MainContent />
                </AuthWrapper>
                <ToastContainer 
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
              />
            </div>
          </Router>
          </RegionProvider>
        </AdminProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
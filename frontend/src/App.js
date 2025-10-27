import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'react-datepicker/dist/react-datepicker.css';

import { LanguageProvider } from './utils/translations';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import AuthWrapper from './components/AuthWrapper';
import Navigation from './components/Navigation';
import GlobalModals from './components/GlobalModals';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Administrator from './pages/Administrator';
import Tickets from './pages/Tickets';
import Absences from './pages/Absences';
import Skills from './pages/Skills';

function MainContent() {
  const location = useLocation();
  const isCalendarPage = location.pathname === '/calendar';

  return (
    <main className={isCalendarPage ? 'main-content calendar-wrapper' : 'main-content'}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/administrator" element={<Administrator />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/absences" element={<Absences />} />
        <Route path="/skills" element={<Skills />} />
      </Routes>
    </main>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AdminProvider>
          <Router>
            <div className="App">
              <AuthWrapper>
                <Navigation />
                <GlobalModals />
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
        </AdminProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
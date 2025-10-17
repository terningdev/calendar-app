import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../utils/translations';
import { useAuth } from '../contexts/AuthContext';

const Navigation = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      closeMenu();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Get current page title based on route
  const getCurrentPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return t('dashboard');
      case '/calendar':
        return t('calendar');
      case '/tickets':
        return t('tickets');
      case '/absences':
        return t('absenceVakt');
      case '/administrator':
        return t('administrator');
      default:
        return t('dashboard');
    }
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        {/* Mobile hamburger button */}
        <button 
          className="hamburger-btn"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
        
        {/* Current page title - mobile only */}
        <div className="nav-title mobile-only">
          {getCurrentPageTitle()}
        </div>

        {/* User info - desktop only */}
        <div className="nav-user-info desktop-only">
          <span className="user-greeting">Welcome, {user?.fullName}</span>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            Logout
          </button>
        </div>
        
        {/* Navigation links - desktop always visible, mobile in overlay */}
        <ul className={`nav-links ${isMenuOpen ? 'nav-links-open' : ''}`}>
          <li>
            <Link to="/" className={isActive('/')} onClick={closeMenu}>
              {t('dashboard')}
            </Link>
          </li>
          <li>
            <Link to="/calendar" className={isActive('/calendar')} onClick={closeMenu}>
              {t('calendar')}
            </Link>
          </li>
          <li>
            <Link to="/tickets" className={isActive('/tickets')} onClick={closeMenu}>
              {t('tickets')}
            </Link>
          </li>
          <li>
            <Link to="/absences" className={`${isActive('/absences')} mobile-show`} onClick={closeMenu}>
              {t('absenceVakt')}
            </Link>
          </li>
          
          {/* Administrator link - moved to bottom on mobile */}
          <li className="nav-admin-item">
            <Link to="/administrator" className={isActive('/administrator')} onClick={closeMenu}>
              <span className="desktop-only">{t('administrator')}</span>
              <span className="mobile-only">⚙️ {t('administrator')}</span>
            </Link>
          </li>

          {/* Mobile logout button */}
          <li className="nav-logout-item mobile-only">
            <button className="logout-btn-mobile" onClick={handleLogout}>
              🚪 Logout ({user?.fullName})
            </button>
          </li>
        </ul>
        
        {/* Mobile overlay backdrop */}
        {isMenuOpen && <div className="nav-overlay mobile-only" onClick={closeMenu}></div>}
      </div>
    </nav>
  );
};

export default Navigation;
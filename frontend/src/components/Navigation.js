import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../utils/translations';

const Navigation = () => {
  const location = useLocation();
  const { t } = useTranslation();
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
        
        {/* App brand - desktop only */}
        <Link to="/" className="nav-brand desktop-only">
          {t('appName')}
        </Link>
        
        {/* Current page title - mobile only */}
        <div className="nav-title mobile-only">
          {getCurrentPageTitle()}
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
          <li className="desktop-only">
            <Link to="/absences" className={isActive('/absences')} onClick={closeMenu}>
              {t('absenceVakt')}
            </Link>
          </li>
          <li className="desktop-only">
            <Link to="/administrator" className={isActive('/administrator')} onClick={closeMenu}>
              {t('administrator')}
            </Link>
          </li>
          
          {/* Mobile-only administrator link at bottom */}
          <li className="mobile-only nav-bottom-item">
            <Link to="/administrator" className={isActive('/administrator')} onClick={closeMenu}>
              ⚙️ {t('administrator')}
            </Link>
          </li>
        </ul>
        
        {/* Mobile overlay backdrop */}
        {isMenuOpen && <div className="nav-overlay mobile-only" onClick={closeMenu}></div>}
      </div>
    </nav>
  );
};

export default Navigation;
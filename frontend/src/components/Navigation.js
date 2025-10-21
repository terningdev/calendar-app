import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../utils/translations';
import { useAdmin } from '../contexts/AdminContext';
import { useAuth } from '../contexts/AuthContext';
import UserMenu from './UserMenu';
import permissionsService from '../services/permissionsService';

const Navigation = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { user, checkAuthStatus } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [permissions, setPermissions] = useState(null);
  const { pendingUserCount, openPendingUsersModal, openManageUsersModal, openSystemStatusModal, openManagePermissionsModal } = useAdmin();

  // Fetch user permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      if (user && user.role) {
        try {
          // Sysadmin always has all permissions
          if (user.role === 'sysadmin') {
            setPermissions({
              viewDashboard: true,
              viewCalendar: true,
              viewTickets: true,
              viewAdministrator: true,
              viewAbsences: true,
              viewSkills: true,
              createTickets: true,
              editOwnTickets: true,
              editAllTickets: true,
              deleteTickets: true,
              assignTickets: true,
              viewUsers: true,
              manageUsers: true,
              approveUsers: true,
              manageDepartments: true,
              manageTechnicians: true,
              viewSystemStatus: true,
              managePermissions: true
            });
          } else {
            const rolePermissions = await permissionsService.getRolePermissions(user.role);
            if (rolePermissions.success) {
              setPermissions(rolePermissions.permissions.permissions);
            }
          }
        } catch (error) {
          console.error('Failed to fetch permissions:', error);
        }
      }
    };

    fetchPermissions();
  }, [user]);

  // Re-check auth status when window regains focus (to detect role changes)
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        checkAuthStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, checkAuthStatus]);

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
      case '/skills':
        return t('skills');
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

        {/* User menu - desktop only */}
        <div className="nav-user-info desktop-only">
          <UserMenu 
            pendingUserCount={pendingUserCount}
            onOpenPendingUsers={openPendingUsersModal}
            onOpenManageUsers={openManageUsersModal}
            onOpenSystemStatus={openSystemStatusModal}
            onOpenManagePermissions={openManagePermissionsModal}
          />
        </div>
        
        {/* Navigation links - desktop always visible, mobile in overlay */}
        <ul className={`nav-links ${isMenuOpen ? 'nav-links-open' : ''}`}>
          {permissions?.viewDashboard === true && (
            <li>
              <Link to="/" className={isActive('/')} onClick={closeMenu}>
                {t('dashboard')}
              </Link>
            </li>
          )}
          {permissions?.viewCalendar === true && (
            <li>
              <Link to="/calendar" className={isActive('/calendar')} onClick={closeMenu}>
                {t('calendar')}
              </Link>
            </li>
          )}
          {permissions?.viewTickets === true && (
            <li>
              <Link to="/tickets" className={isActive('/tickets')} onClick={closeMenu}>
                {t('tickets')}
              </Link>
            </li>
          )}
          {permissions?.viewAbsences === true && (
            <li>
              <Link to="/absences" className={`${isActive('/absences')} mobile-show`} onClick={closeMenu}>
                {t('absenceVakt')}
              </Link>
            </li>
          )}
          
          {/* Skills link */}
          {permissions?.viewSkills === true && (
            <li>
              <Link to="/skills" className={isActive('/skills')} onClick={closeMenu}>
                {t('skills')}
              </Link>
            </li>
          )}
          
          {/* Administrator link - moved to bottom on mobile */}
          {permissions?.viewAdministrator === true && (
            <li className="nav-admin-item">
              <Link to="/administrator" className={isActive('/administrator')} onClick={closeMenu}>
                <span className="desktop-only">{t('administrator')}</span>
                <span className="mobile-only">⚙️ {t('administrator')}</span>
              </Link>
            </li>
          )}
        </ul>
        
        {/* Mobile overlay backdrop */}
        {isMenuOpen && <div className="nav-overlay mobile-only" onClick={closeMenu}></div>}
      </div>
    </nav>
  );
};

export default Navigation;
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../utils/translations';
import bugReportService from '../services/bugReportService';
import { toast } from 'react-toastify';

const UserMenu = ({ pendingUserCount, bugReportCount, onOpenPendingUsers, onOpenManageUsers, onOpenSystemStatus, onOpenManagePermissions, onOpenBugReports, isMobileMenu = false, onCloseMenu }) => {
  const { user, logout, updateUserPin } = useAuth();
  const { language, changeLanguage } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [bugReportMessage, setBugReportMessage] = useState('');
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsMenuOpen(false);
      if (onCloseMenu) onCloseMenu(); // Close mobile menu if in mobile view
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const openSettings = () => {
    setIsSettingsOpen(true);
    setIsMenuOpen(false);
    if (onCloseMenu) onCloseMenu(); // Close mobile menu if in mobile view
    // Reset password fields and messages when opening settings
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    setPasswordSuccess('');
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
    // Reset password fields and messages when closing
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handleThemeChange = (e) => {
    setTheme(e.target.value);
  };

  const handleLanguageChange = (e) => {
    changeLanguage(e.target.value);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 4) {
      setPasswordError('New password must be at least 4 characters');
      return;
    }

    try {
      await updateUserPin(passwordData.currentPassword, passwordData.newPassword);
      setPasswordSuccess('Password updated successfully!');
      // Clear the form after 2 seconds
      setTimeout(() => {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordSuccess('');
      }, 2000);
    } catch (error) {
      setPasswordError(error.message || 'Failed to update password');
    }
  };

  const openBugReport = () => {
    setIsBugReportOpen(true);
    setIsMenuOpen(false);
    setBugReportMessage('');
    if (onCloseMenu) onCloseMenu(); // Close mobile menu if in mobile view
  };

  const closeBugReport = () => {
    setIsBugReportOpen(false);
    setBugReportMessage('');
  };

  const handleBugReportSubmit = async (e) => {
    e.preventDefault();
    
    if (!bugReportMessage.trim()) {
      toast.error('Please enter a bug description');
      return;
    }

    setIsSubmittingBug(true);
    try {
      await bugReportService.create(bugReportMessage);
      toast.success('Bug report submitted successfully!');
      closeBugReport();
    } catch (error) {
      console.error('Error submitting bug report:', error);
      toast.error('Failed to submit bug report');
    } finally {
      setIsSubmittingBug(false);
    }
  };

  // Calculate total notification count (for users with viewBugReports permission)
  const totalNotifications = user?.permissions?.viewBugReports
    ? pendingUserCount + bugReportCount
    : 0;

  // Helper function to check if user has a permission
  const hasPermission = (permission) => {
    return user?.permissions?.[permission] === true;
  };

  // Render Settings Modal
  const renderSettingsModal = () => {
    if (!isSettingsOpen) return null;
    
    return ReactDOM.createPortal(
      <div 
        className="modal" 
        style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}>
        <div className="modal-content" style={{ 
          maxWidth: '600px',
          width: '90%',
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <div className="modal-header">
            <h2 className="modal-title">⚙️ Settings</h2>
            <button className="modal-close" onClick={closeSettings}>×</button>
          </div>
          
          {/* Appearance Section */}
          <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #e0e0e0' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', color: '#333' }}>🎨 Appearance</h3>
            
            <div className="form-group">
              <label className="form-label">Theme</label>
              <select 
                className="form-control" 
                value={theme} 
                onChange={handleThemeChange}
              >
                <option value="light">☀️ Light</option>
                <option value="dark">🌙 Dark</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Language</label>
              <select 
                className="form-control" 
                value={language} 
                onChange={handleLanguageChange}
              >
                <option value="en">🇬🇧 English</option>
                <option value="no">🇳🇴 Norsk</option>
              </select>
            </div>
          </div>

          {/* Security Section */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', color: '#333' }}>🔐 Security</h3>
            
            <form onSubmit={handlePasswordSubmit}>
              {passwordError && (
                <div className="alert alert-error" style={{ marginBottom: '15px' }}>
                  {passwordError}
                </div>
              )}
              
              {passwordSuccess && (
                <div className="alert alert-success" style={{ marginBottom: '15px' }}>
                  {passwordSuccess}
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                />
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginBottom: '10px' }}
                disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              >
                Update Password
              </button>
            </form>
          </div>
          
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={closeSettings}>
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Render Bug Report Modal
  const renderBugReportModal = () => {
    if (!isBugReportOpen) return null;
    
    return ReactDOM.createPortal(
      <div 
        className="modal" 
        style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div 
          className="modal-content" 
          style={{ 
            backgroundColor: 'var(--card-background)',
            padding: '0',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header" style={{ 
            padding: '20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ margin: 0 }}>🐛 Report a Bug</h2>
            <button 
              onClick={closeBugReport}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'var(--text-color)'
              }}
            >
              ×
            </button>
          </div>
          
          <div className="modal-body" style={{ 
            padding: '20px',
            overflowY: 'auto',
            flex: '1'
          }}>
            <form onSubmit={handleBugReportSubmit}>
              <div className="form-group">
                <label className="form-label">Bug Description</label>
                <textarea
                  className="form-control"
                  value={bugReportMessage}
                  onChange={(e) => setBugReportMessage(e.target.value)}
                  placeholder="Please describe the bug you encountered..."
                  rows="6"
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={isSubmittingBug || !bugReportMessage.trim()}
                >
                  {isSubmittingBug ? 'Sending...' : 'Send Report'}
                </button>
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={closeBugReport}
                  disabled={isSubmittingBug}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Mobile menu version - expandable section at bottom
  if (isMobileMenu) {
    return (
      <>
        <div className="mobile-user-section">
          <button
            className="mobile-user-button"
            onClick={toggleMenu}
          >
            <div className="mobile-user-info">
              <span className="mobile-user-name">
                {user?.firstName || user?.fullName?.split(' ')[0] || user?.username || 'User'}
              </span>
              {totalNotifications > 0 && (
                <span className="badge-notification-mobile">
                  {totalNotifications}
                </span>
              )}
            </div>
            <span className={`mobile-menu-arrow ${isMenuOpen ? 'open' : ''}`}>▼</span>
          </button>

          {isMenuOpen && (
            <div className="mobile-user-menu-expanded">
              {onOpenPendingUsers && hasPermission('approveUsers') && (
                <div className="mobile-user-menu-item" onClick={() => { 
                  setIsMenuOpen(false); 
                  onOpenPendingUsers();
                  if (onCloseMenu) onCloseMenu();
                }}>
                  👥 Pending Users
                  {pendingUserCount > 0 && (
                    <span className="badge-small">
                      {pendingUserCount}
                    </span>
                  )}
                </div>
              )}
              {onOpenManageUsers && hasPermission('manageUsers') && (
                <div className="mobile-user-menu-item" onClick={() => { 
                  setIsMenuOpen(false); 
                  onOpenManageUsers();
                  if (onCloseMenu) onCloseMenu();
                }}>
                  👥 Manage Users
                </div>
              )}
              {onOpenBugReports && hasPermission('viewBugReports') && (
                <div className="mobile-user-menu-item" onClick={() => { 
                  setIsMenuOpen(false); 
                  onOpenBugReports();
                  if (onCloseMenu) onCloseMenu();
                }}>
                  🐛 Manage Bug Reports
                  {bugReportCount > 0 && (
                    <span className="badge-small">
                      {bugReportCount}
                    </span>
                  )}
                </div>
              )}
              {onOpenManagePermissions && hasPermission('managePermissions') && (
                <div className="mobile-user-menu-item" onClick={() => { 
                  setIsMenuOpen(false); 
                  onOpenManagePermissions();
                  if (onCloseMenu) onCloseMenu();
                }}>
                  🔐 Manage RBAC
                </div>
              )}
              {onOpenSystemStatus && (
                <div className="mobile-user-menu-item" onClick={() => { 
                  setIsMenuOpen(false); 
                  onOpenSystemStatus();
                  if (onCloseMenu) onCloseMenu();
                }}>
                  📊 System Status
                </div>
              )}
              {hasPermission('submitBugReport') && (
                <div className="mobile-user-menu-item" onClick={openBugReport}>
                  🐛 Report a Bug!
                </div>
              )}
              <div className="mobile-user-menu-item" onClick={openSettings}>
                ⚙️ Settings
              </div>
              <div className="mobile-user-menu-item danger" onClick={handleLogout}>
                🚪 Logout
              </div>
            </div>
          )}
        </div>

        {/* Modals are shared between mobile and desktop */}
        {isSettingsOpen && renderSettingsModal()}
        {isBugReportOpen && renderBugReportModal()}
      </>
    );
  }

  // Desktop version - updated to show first name
  return (
    <>
      <div className="nav-user-menu">
        <button
          ref={buttonRef}
          className="user-menu-button"
          onClick={toggleMenu}
          title={user?.firstName || user?.fullName || user?.username || 'User'}
          style={{ 
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            padding: '10px 16px',
            minWidth: '80px'
          }}
        >
          <span style={{
            color: 'white',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            {user?.firstName || user?.fullName?.split(' ')[0] || user?.username || 'User'}
          </span>
          {totalNotifications > 0 && (
            <span className="badge-notification" style={{ 
              position: 'absolute', 
              top: '-8px', 
              right: '-8px',
              minWidth: '20px',
              height: '20px',
              borderRadius: '10px',
              backgroundColor: '#ff9800',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 6px'
            }}>
              {totalNotifications}
            </span>
          )}
        </button>

        {isMenuOpen && (
          <div ref={menuRef} className="user-menu-dropdown">
            {onOpenPendingUsers && hasPermission('approveUsers') && (
              <div className="user-menu-item" onClick={() => { 
                setIsMenuOpen(false); 
                onOpenPendingUsers();
              }}>
                👥 Pending Users
                {pendingUserCount > 0 && (
                  <span style={{
                    marginLeft: '8px',
                    backgroundColor: '#ff9800',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    {pendingUserCount}
                  </span>
                )}
              </div>
            )}
            {onOpenManageUsers && hasPermission('manageUsers') && (
              <div className="user-menu-item" onClick={() => { 
                setIsMenuOpen(false); 
                onOpenManageUsers();
              }}>
                👥 Manage Users
              </div>
            )}
            {onOpenBugReports && hasPermission('viewBugReports') && (
              <div className="user-menu-item" onClick={() => { 
                setIsMenuOpen(false); 
                onOpenBugReports();
              }}>
                🐛 Manage Bug Reports
                {bugReportCount > 0 && (
                  <span style={{
                    marginLeft: '8px',
                    backgroundColor: '#ff9800',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    {bugReportCount}
                  </span>
                )}
              </div>
            )}
            {onOpenManagePermissions && hasPermission('managePermissions') && (
              <div className="user-menu-item" onClick={() => { 
                setIsMenuOpen(false); 
                onOpenManagePermissions();
              }}>
                🔐 Manage RBAC
              </div>
            )}
            {onOpenSystemStatus && (
              <div className="user-menu-item" onClick={() => { 
                setIsMenuOpen(false); 
                onOpenSystemStatus();
              }}>
                📊 System Status
              </div>
            )}
            {hasPermission('submitBugReport') && (
              <div className="user-menu-item" onClick={openBugReport}>
                🐛 Report a Bug!
              </div>
            )}
            <div className="user-menu-item" onClick={openSettings}>
              ⚙️ Settings
            </div>
            <div className="user-menu-item danger" onClick={handleLogout}>
              🚪 Logout
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {renderSettingsModal()}

      {/* Bug Report Modal */}
      {renderBugReportModal()}
    </>
  );
};

export default UserMenu;

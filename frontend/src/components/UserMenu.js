import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../utils/translations';

const UserMenu = ({ pendingUserCount, onOpenPendingUsers, onOpenManageUsers, onOpenSystemStatus }) => {
  const { user, logout, updateUserPin } = useAuth();
  const { language, changeLanguage } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const openSettings = () => {
    setIsSettingsOpen(true);
    setIsMenuOpen(false);
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

  return (
    <>
      <div className="nav-user-menu">
        <button
          ref={buttonRef}
          className="user-menu-button"
          onClick={toggleMenu}
          title="User menu"
          style={{ position: 'relative' }}
        >
          <span>{user?.firstName || user?.fullName?.split(' ')[0] || user?.username || 'User'}</span>
          <span style={{ fontSize: '0.7rem' }}>▼</span>
          {pendingUserCount > 0 && (
            <span className="badge-notification" style={{ 
              position: 'absolute', 
              top: '-5px', 
              right: '-5px',
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
              {pendingUserCount}
            </span>
          )}
        </button>

        {isMenuOpen && (
          <div ref={menuRef} className="user-menu-dropdown">
            {onOpenPendingUsers && user && (user.role === 'administrator' || user.role === 'sysadmin') && (
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
            {onOpenManageUsers && user && (user.role === 'administrator' || user.role === 'sysadmin') && (
              <div className="user-menu-item" onClick={() => { 
                setIsMenuOpen(false); 
                onOpenManageUsers();
              }}>
                👥 Manage Users
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
      {isSettingsOpen && ReactDOM.createPortal(
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
      )}
    </>
  );
};

export default UserMenu;

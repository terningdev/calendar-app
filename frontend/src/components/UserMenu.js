import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../utils/translations';

const UserMenu = ({ pendingUserCount, onOpenPendingUsers, onOpenManageUsers }) => {
  const { user, logout, updateUserPin } = useAuth();
  const { language, changeLanguage } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPinChangeOpen, setIsPinChangeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [pinChangeData, setPinChangeData] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: ''
  });
  const [pinChangeError, setPinChangeError] = useState('');
  const [pinChangeLoading, setPinChangeLoading] = useState(false);
  const [pinChangeSuccess, setPinChangeSuccess] = useState('');
  
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

  const openPinChange = () => {
    setIsPinChangeOpen(true);
    setIsMenuOpen(false);
    setPinChangeError('');
    setPinChangeSuccess('');
    setPinChangeData({
      currentPin: '',
      newPin: '',
      confirmPin: ''
    });
  };

  const closePinChange = () => {
    setIsPinChangeOpen(false);
    setPinChangeError('');
    setPinChangeSuccess('');
    setPinChangeData({
      currentPin: '',
      newPin: '',
      confirmPin: ''
    });
  };

  const openSettings = () => {
    setIsSettingsOpen(true);
    setIsMenuOpen(false);
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  const handleThemeChange = (e) => {
    setTheme(e.target.value);
  };

  const handleLanguageChange = (e) => {
    changeLanguage(e.target.value);
  };

  const handlePinChange = (e) => {
    const { name, value } = e.target;
    setPinChangeData(prev => ({
      ...prev,
      [name]: value
    }));
    setPinChangeError('');
  };

  const validatePin = (pin) => {
    if (pin.length !== 4) {
      return 'PIN must be exactly 4 digits';
    }
    if (!/^\d{4}$/.test(pin)) {
      return 'PIN must contain only numbers';
    }
    return null;
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setPinChangeError('');
    setPinChangeSuccess('');

    // Validation
    if (!pinChangeData.currentPin || !pinChangeData.newPin || !pinChangeData.confirmPin) {
      setPinChangeError('All fields are required');
      return;
    }

    const currentPinError = validatePin(pinChangeData.currentPin);
    if (currentPinError) {
      setPinChangeError(`Current PIN: ${currentPinError}`);
      return;
    }

    const newPinError = validatePin(pinChangeData.newPin);
    if (newPinError) {
      setPinChangeError(`New PIN: ${newPinError}`);
      return;
    }

    if (pinChangeData.newPin !== pinChangeData.confirmPin) {
      setPinChangeError('New PIN and confirmation do not match');
      return;
    }

    if (pinChangeData.currentPin === pinChangeData.newPin) {
      setPinChangeError('New PIN must be different from current PIN');
      return;
    }

    setPinChangeLoading(true);

    try {
      await updateUserPin(pinChangeData.currentPin, pinChangeData.newPin);
      setPinChangeSuccess('PIN updated successfully!');
      
      // Auto-close after success
      setTimeout(() => {
        closePinChange();
      }, 2000);
    } catch (error) {
      console.error('PIN change error:', error);
      setPinChangeError(error.message || 'Failed to update PIN. Please check your current PIN and try again.');
    } finally {
      setPinChangeLoading(false);
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
              <div className="user-menu-item" onClick={() => { onOpenPendingUsers(); setIsMenuOpen(false); }}>
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
              <div className="user-menu-item" onClick={() => { onOpenManageUsers(); setIsMenuOpen(false); }}>
                👥 Manage Users
              </div>
            )}
            <div className="user-menu-item" onClick={openSettings}>
              ⚙️ Settings
            </div>
            <div className="user-menu-item" onClick={openPinChange}>
              🔐 Change PIN
            </div>
            <div className="user-menu-item danger" onClick={handleLogout}>
              🚪 Logout
            </div>
          </div>
        )}
      </div>

      {/* PIN Change Modal */}
      {isPinChangeOpen && (
        <div className="modal-overlay" onClick={closePinChange}>
          <div className="modern-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modern-modal-header">
              <h2 className="modern-modal-title">
                <span className="modal-icon">🔐</span>
                Change PIN Code
              </h2>
              <button className="modern-modal-close" onClick={closePinChange}>×</button>
            </div>
            
            <form onSubmit={handlePinSubmit} className="modern-modal-body">
              {pinChangeError && (
                <div className="alert alert-error">
                  <span className="alert-icon">⚠️</span>
                  {pinChangeError}
                </div>
              )}
              
              {pinChangeSuccess && (
                <div className="alert alert-success">
                  <span className="alert-icon">✓</span>
                  {pinChangeSuccess}
                </div>
              )}

              <div className="modern-form-group">
                <label className="modern-label">Current PIN</label>
                <input
                  type="password"
                  id="currentPin"
                  name="currentPin"
                  value={pinChangeData.currentPin}
                  onChange={handlePinChange}
                  maxLength="4"
                  className="modern-input"
                  placeholder="••••"
                  disabled={pinChangeLoading}
                  autoComplete="current-password"
                />
              </div>

              <div className="modern-form-group">
                <label className="modern-label">New PIN</label>
                <input
                  type="password"
                  id="newPin"
                  name="newPin"
                  value={pinChangeData.newPin}
                  onChange={handlePinChange}
                  maxLength="4"
                  className="modern-input"
                  placeholder="••••"
                  disabled={pinChangeLoading}
                  autoComplete="new-password"
                />
                <small className="modern-hint">
                  Enter a 4-digit numeric PIN
                </small>
              </div>

              <div className="modern-form-group">
                <label className="modern-label">Confirm New PIN</label>
                <input
                  type="password"
                  id="confirmPin"
                  name="confirmPin"
                  value={pinChangeData.confirmPin}
                  onChange={handlePinChange}
                  maxLength="4"
                  className="modern-input"
                  placeholder="••••"
                  disabled={pinChangeLoading}
                  autoComplete="new-password"
                />
              </div>

              <div className="modern-modal-footer">
                <button
                  type="button"
                  className="modern-btn modern-btn-secondary"
                  onClick={closePinChange}
                  disabled={pinChangeLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modern-btn modern-btn-primary"
                  disabled={pinChangeLoading}
                >
                  {pinChangeLoading ? (
                    <>
                      <span className="spinner"></span>
                      Updating...
                    </>
                  ) : (
                    'Update PIN'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-overlay" onClick={closeSettings}>
          <div className="modern-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modern-modal-header">
              <h2 className="modern-modal-title">
                <span className="modal-icon">⚙️</span>
                Settings
              </h2>
              <button className="modern-modal-close" onClick={closeSettings}>×</button>
            </div>
            
            <div className="modern-modal-body">
              <div className="settings-section">
                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-label">
                      <span className="setting-icon">🎨</span>
                      Theme
                    </div>
                    <div className="setting-description">Choose your preferred color theme</div>
                  </div>
                  <select 
                    value={theme} 
                    onChange={handleThemeChange}
                    className="modern-select"
                  >
                    <option value="light">☀️ Light</option>
                    <option value="dark">🌙 Dark</option>
                  </select>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-label">
                      <span className="setting-icon">🌍</span>
                      Language
                    </div>
                    <div className="setting-description">Select your language preference</div>
                  </div>
                  <select 
                    value={language} 
                    onChange={handleLanguageChange}
                    className="modern-select"
                  >
                    <option value="en">🇬🇧 English</option>
                    <option value="no">🇳🇴 Norsk</option>
                  </select>
                </div>
              </div>

              <div className="modern-modal-footer">
                <button
                  type="button"
                  className="modern-btn modern-btn-primary"
                  onClick={closeSettings}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserMenu;
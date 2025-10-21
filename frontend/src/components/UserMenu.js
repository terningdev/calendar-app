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
        <div className="modal">
          <div className="modal-content user-settings-modal">
            <div className="modal-header" style={{ 
              margin: '0', 
              padding: '24px 30px', 
              borderBottom: '2px solid #e8e8e8',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
              <h2 className="modal-title" style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '12px', margin: '0' }}>
                <span style={{ fontSize: '28px' }}>🔐</span>
                <span>Change PIN Code</span>
              </h2>
              <button 
                className="modal-close" 
                onClick={closePinChange}
                style={{ color: '#ffffff', fontSize: '32px', opacity: '0.9' }}
              >×</button>
            </div>
            
            <form onSubmit={handlePinSubmit}>
              <div className="modal-body" style={{ padding: '30px' }}>
                {pinChangeError && (
                  <div style={{ 
                    padding: '14px 16px', 
                    marginBottom: '20px', 
                    backgroundColor: '#fee2e2', 
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px'
                  }}>
                    <span style={{ fontSize: '18px' }}>⚠️</span>
                    <span>{pinChangeError}</span>
                  </div>
                )}
                
                {pinChangeSuccess && (
                  <div style={{ 
                    padding: '14px 16px', 
                    marginBottom: '20px', 
                    backgroundColor: '#d1fae5', 
                    border: '1px solid #6ee7b7',
                    borderRadius: '8px',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px'
                  }}>
                    <span style={{ fontSize: '18px' }}>✅</span>
                    <span>{pinChangeSuccess}</span>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label htmlFor="currentPin" className="form-label" style={{ 
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '14px'
                  }}>
                    Current PIN
                  </label>
                  <input
                    type="password"
                    id="currentPin"
                    name="currentPin"
                    value={pinChangeData.currentPin}
                    onChange={handlePinChange}
                    maxLength="4"
                    className="form-control"
                    placeholder="Enter current PIN"
                    disabled={pinChangeLoading}
                    autoComplete="current-password"
                    style={{
                      padding: '12px 16px',
                      fontSize: '16px',
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                      width: '100%',
                      transition: 'border-color 0.2s',
                      letterSpacing: '4px'
                    }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label htmlFor="newPin" className="form-label" style={{ 
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '14px'
                  }}>
                    New PIN
                  </label>
                  <input
                    type="password"
                    id="newPin"
                    name="newPin"
                    value={pinChangeData.newPin}
                    onChange={handlePinChange}
                    maxLength="4"
                    className="form-control"
                    placeholder="Enter new PIN"
                    disabled={pinChangeLoading}
                    autoComplete="new-password"
                    style={{
                      padding: '12px 16px',
                      fontSize: '16px',
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                      width: '100%',
                      transition: 'border-color 0.2s',
                      letterSpacing: '4px'
                    }}
                  />
                  <small style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '8px', 
                    color: '#6b7280', 
                    fontSize: '13px' 
                  }}>
                    <span>💡</span>
                    <span>Enter a 4-digit numeric PIN code</span>
                  </small>
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label htmlFor="confirmPin" className="form-label" style={{ 
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '14px'
                  }}>
                    Confirm New PIN
                  </label>
                  <input
                    type="password"
                    id="confirmPin"
                    name="confirmPin"
                    value={pinChangeData.confirmPin}
                    onChange={handlePinChange}
                    maxLength="4"
                    className="form-control"
                    placeholder="Confirm new PIN"
                    disabled={pinChangeLoading}
                    autoComplete="new-password"
                    style={{
                      padding: '12px 16px',
                      fontSize: '16px',
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                      width: '100%',
                      transition: 'border-color 0.2s',
                      letterSpacing: '4px'
                    }}
                  />
                </div>

                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  justifyContent: 'flex-end', 
                  marginTop: '32px',
                  paddingTop: '24px',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closePinChange}
                    disabled={pinChangeLoading}
                    style={{
                      padding: '12px 24px',
                      fontSize: '15px',
                      fontWeight: '500',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={pinChangeLoading}
                    style={{
                      padding: '12px 32px',
                      fontSize: '15px',
                      fontWeight: '500',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      cursor: pinChangeLoading ? 'not-allowed' : 'pointer',
                      opacity: pinChangeLoading ? '0.7' : '1',
                      transition: 'all 0.2s',
                      minWidth: '140px'
                    }}
                  >
                    {pinChangeLoading ? '⏳ Updating...' : '✓ Update PIN'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="modal">
          <div className="modal-content user-settings-modal">
            <div className="modal-header" style={{ 
              margin: '0', 
              padding: '24px 30px', 
              borderBottom: '2px solid #e8e8e8',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
            }}>
              <h2 className="modal-title" style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '12px', margin: '0' }}>
                <span style={{ fontSize: '28px' }}>⚙️</span>
                <span>Settings</span>
              </h2>
              <button 
                className="modal-close" 
                onClick={closeSettings}
                style={{ color: '#ffffff', fontSize: '32px', opacity: '0.9' }}
              >×</button>
            </div>
            
            <div className="modal-body" style={{ padding: '30px' }}>
              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '24px' }}>🎨</span>
                  <label className="form-label" style={{ 
                    margin: '0',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '15px'
                  }}>
                    Theme
                  </label>
                </div>
                <select 
                  value={theme} 
                  onChange={handleThemeChange}
                  className="form-control"
                  style={{
                    padding: '14px 16px',
                    fontSize: '15px',
                    borderRadius: '8px',
                    border: '2px solid #e5e7eb',
                    width: '100%',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23374151\' d=\'M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z\'/%3E%3C/svg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 16px center',
                    paddingRight: '44px'
                  }}
                >
                  <option value="light">☀️ Light Mode</option>
                  <option value="dark">🌙 Dark Mode</option>
                </select>
                <small style={{ 
                  display: 'block',
                  marginTop: '8px', 
                  color: '#6b7280', 
                  fontSize: '13px',
                  paddingLeft: '36px'
                }}>
                  Choose your preferred color theme
                </small>
              </div>

              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '24px' }}>🌍</span>
                  <label className="form-label" style={{ 
                    margin: '0',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '15px'
                  }}>
                    Language
                  </label>
                </div>
                <select 
                  value={language} 
                  onChange={handleLanguageChange}
                  className="form-control"
                  style={{
                    padding: '14px 16px',
                    fontSize: '15px',
                    borderRadius: '8px',
                    border: '2px solid #e5e7eb',
                    width: '100%',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23374151\' d=\'M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z\'/%3E%3C/svg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 16px center',
                    paddingRight: '44px'
                  }}
                >
                  <option value="en">🇬🇧 English</option>
                  <option value="no">🇳🇴 Norsk (Norwegian)</option>
                </select>
                <small style={{ 
                  display: 'block',
                  marginTop: '8px', 
                  color: '#6b7280', 
                  fontSize: '13px',
                  paddingLeft: '36px'
                }}>
                  Select your language preference
                </small>
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                marginTop: '32px',
                paddingTop: '24px',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={closeSettings}
                  style={{
                    padding: '12px 32px',
                    fontSize: '15px',
                    fontWeight: '500',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minWidth: '120px'
                  }}
                >
                  ✓ Done
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
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'react-toastify';
import { useAdmin } from '../contexts/AdminContext';
import { useAuth } from '../contexts/AuthContext';
import userService from '../services/userService';
import authService from '../services/authService';
import { statusService } from '../services/statusService';

const GlobalModals = () => {
  const { user } = useAuth();
  const { setPendingUserCount, setOpenPendingUsersModal, setOpenManageUsersModal, setOpenSystemStatusModal } = useAdmin();
  
  const [showPendingUsersModal, setShowPendingUsersModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showSystemStatusModal, setShowSystemStatusModal] = useState(false);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // System Status state
  const [systemStatus, setSystemStatus] = useState({
    backend: { status: 'checking', message: 'Checking connection...' },
    database: { status: 'checking', message: 'Checking connection...' }
  });
  const [statusLoading, setStatusLoading] = useState(false);
  
  // Edit user modal state
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    role: 'user',
    requirePasswordReset: false
  });

  const loadPendingUsersCount = async () => {
    try {
      const response = await authService.getPendingUsers();
      const usersArray = Array.isArray(response) ? response : (response?.users || []);
      setPendingUserCount(usersArray.length);
    } catch (error) {
      console.error('Failed to load pending users count:', error);
    }
  };

  const openPendingUsersModal = () => {
    console.log('GlobalModals: Opening Pending Users Modal');
    setShowPendingUsersModal(true);
    loadPendingUsers();
  };

  const openUsersModal = () => {
    console.log('GlobalModals: Opening Manage Users Modal');
    setShowUsersModal(true);
    loadAllUsers();
  };

  const openSystemStatusModal = () => {
    console.log('GlobalModals: Opening System Status Modal');
    setShowSystemStatusModal(true);
    checkSystemStatus();
  };

  const checkSystemStatus = async () => {
    setStatusLoading(true);
    try {
      const status = await statusService.getSystemStatus();
      setSystemStatus(status);
    } catch (error) {
      console.error('Error checking system status:', error);
      setSystemStatus({
        backend: { status: 'error', message: 'Failed to check backend status' },
        database: { status: 'unknown', message: 'Backend unreachable' }
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
        return '🟢';
      case 'disconnected':
      case 'error':
        return '🔴';
      case 'checking':
        return '🟡';
      default:
        return '⚪';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return '#27ae60';
      case 'disconnected':
      case 'error':
        return '#e74c3c';
      case 'checking':
        return '#f39c12';
      default:
        return '#95a5a6';
    }
  };

  const loadPendingUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await authService.getPendingUsers();
      console.log('getPendingUsers response:', response);
      // Ensure we have an array
      const usersArray = Array.isArray(response) ? response : (response?.users || []);
      setPendingUsers(usersArray);
      setPendingUserCount(usersArray.length);
    } catch (error) {
      toast.error('Failed to load pending users');
      console.error('Error loading pending users:', error);
      setPendingUsers([]); // Set empty array on error
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await userService.getAllUsers();
      console.log('getAllUsers response:', response);
      // Ensure we have an array
      const usersArray = Array.isArray(response) ? response : (response?.users || []);
      setAllUsers(usersArray);
    } catch (error) {
      toast.error('Failed to load users');
      console.error('Error loading users:', error);
      setAllUsers([]); // Set empty array on error
    } finally {
      setLoadingUsers(false);
    }
  };

  // Register modal openers with AdminContext
  useEffect(() => {
    setOpenPendingUsersModal(() => openPendingUsersModal);
    setOpenManageUsersModal(() => openUsersModal);
    setOpenSystemStatusModal(() => openSystemStatusModal);
    
    return () => {
      setOpenPendingUsersModal(null);
      setOpenManageUsersModal(null);
      setOpenSystemStatusModal(null);
    };
  }, [setOpenPendingUsersModal, setOpenManageUsersModal, setOpenSystemStatusModal]);

  // Load pending users count on mount
  useEffect(() => {
    loadPendingUsersCount();
  }, []);

  const handleApproveUser = async (email) => {
    try {
      await authService.approveUser(email);
      toast.success('User approved successfully');
      loadPendingUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to approve user');
    }
  };

  const handleRejectUser = async (email) => {
    if (!window.confirm('Are you sure you want to reject this user registration?')) {
      return;
    }
    try {
      await authService.rejectUser(email);
      toast.success('User registration rejected');
      loadPendingUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to reject user');
    }
  };

  const handleDeleteUser = async (identifier) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    try {
      await userService.deleteUser(identifier);
      toast.success('User deleted successfully');
      loadAllUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const openEditUserModal = (userToEdit) => {
    setEditingUser(userToEdit);
    setUserFormData({
      firstName: userToEdit.firstName || '',
      lastName: userToEdit.lastName || '',
      phone: userToEdit.phone || '',
      email: userToEdit.email || '',
      role: userToEdit.role || 'user',
      requirePasswordReset: userToEdit.requirePasswordReset || false
    });
  };

  const closeEditUserModal = () => {
    setEditingUser(null);
    setUserFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      role: 'user',
      requirePasswordReset: false
    });
  };

  const handleUserFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUserFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await userService.updateUser(editingUser.username || editingUser.email, userFormData);
      toast.success('User updated successfully');
      closeEditUserModal();
      loadAllUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to update user');
    }
  };

  return (
    <>
      {/* Pending Users Modal */}
      {showPendingUsersModal && ReactDOM.createPortal(
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Pending User Registrations</h2>
              <div className="modal-header-actions">
                <button 
                  className="btn btn-outline btn-sm" 
                  onClick={loadPendingUsers}
                  disabled={loadingUsers}
                  title="Refresh pending users list"
                >
                  🔄 Refresh
                </button>
                <button className="modal-close" onClick={() => setShowPendingUsersModal(false)}>
                  ×
                </button>
              </div>
            </div>
            <div className="modal-body">
              {loadingUsers ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Loading pending users...</p>
                </div>
              ) : !Array.isArray(pendingUsers) || pendingUsers.length === 0 ? (
                <div className="empty-state">
                  <p>No pending user registrations</p>
                </div>
              ) : (
                <div className="pending-users-list">
                  {pendingUsers.map((user) => (
                    <div key={user.email} className="pending-user-card" style={{
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '15px',
                      marginBottom: '12px',
                      backgroundColor: '#fafafa'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                            {user.firstName} {user.lastName} - <span style={{ color: '#666', fontSize: '0.95rem' }}>{user.email}</span>
                          </div>
                        </div>
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={() => handleApproveUser(user.email)}
                          title="Approve Registration"
                          style={{ marginLeft: '10px' }}
                        >
                          ✓ Approve
                        </button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>
                          +47 {user.phone} - <span style={{ fontStyle: 'italic' }}>Registered: {new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRejectUser(user.email)}
                          title="Reject Registration"
                        >
                          ✗ Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* User Management Modal */}
      {showUsersModal && ReactDOM.createPortal(
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2 className="modal-title">👥 Manage Users</h2>
              <button className="modal-close" onClick={() => setShowUsersModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '15px' }}>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={loadAllUsers}
                  title="Refresh users list"
                >
                  🔄 Refresh
                </button>
              </div>

              {loadingUsers ? (
                <div className="loading-container">
                  <p>Loading users...</p>
                </div>
              ) : !Array.isArray(allUsers) || allUsers.length === 0 ? (
                <p className="empty-state">No users found</p>
              ) : (
                <div className="pending-users-list">
                  {allUsers.map(u => (
                    <div key={u.email || u.username} className="pending-user-card" style={{
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '18px',
                      marginBottom: '12px',
                      backgroundColor: '#fafafa',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '15px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '8px', fontSize: '1.05rem' }}>
                          <span style={{ fontWeight: '600', color: '#333' }}>
                            {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : (u.username || 'Unknown')}
                          </span>
                          {u.phone && (
                            <>
                              <span style={{ margin: '0 8px', color: '#999' }}>•</span>
                              <span style={{ color: '#666' }}>+47 {u.phone}</span>
                            </>
                          )}
                          {u.email && (
                            <>
                              <span style={{ margin: '0 8px', color: '#999' }}>•</span>
                              <span style={{ color: '#666' }}>{u.email}</span>
                            </>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className={`badge badge-${u.role === 'sysadmin' ? 'danger' : u.role === 'administrator' ? 'warning' : u.role === 'technician' ? 'info' : 'secondary'}`}>
                            {u.role}
                          </span>
                          {u.requirePasswordReset && (
                            <span className="badge badge-warning" title="User must reset password on next login">
                              🔒 Reset Required
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openEditUserModal(u)}
                          title="Edit user"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteUser(u.username || u.email)}
                          disabled={u.role === 'sysadmin' || (u.email && u.email === user?.email) || (u.username && u.username === user?.username)}
                          title={u.role === 'sysadmin' ? 'Cannot delete sysadmin' : ((u.email && u.email === user?.email) || (u.username && u.username === user?.username)) ? 'Cannot delete yourself' : 'Delete user'}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowUsersModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit User Modal */}
      {editingUser && ReactDOM.createPortal(
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">✏️ Edit User</h2>
              <button className="modal-close" onClick={closeEditUserModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="firstName"
                    value={userFormData.firstName}
                    onChange={handleUserFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="lastName"
                    value={userFormData.lastName}
                    onChange={handleUserFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    name="phone"
                    value={userFormData.phone}
                    onChange={handleUserFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={userFormData.email}
                    onChange={handleUserFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-control"
                    name="role"
                    value={userFormData.role}
                    onChange={handleUserFormChange}
                    disabled={editingUser.role === 'sysadmin' && user?.role !== 'sysadmin'}
                    required
                  >
                    <option value="user">User</option>
                    <option value="technician">Technician</option>
                    <option value="administrator">Administrator</option>
                    <option value="sysadmin">Sysadmin</option>
                  </select>
                  {editingUser.role === 'sysadmin' && user?.role !== 'sysadmin' && (
                    <small className="form-text" style={{ color: 'orange' }}>
                      Only sysadmin can modify sysadmin role
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="requirePasswordReset"
                      checked={userFormData.requirePasswordReset}
                      onChange={handleUserFormChange}
                      style={{ marginRight: '8px' }}
                    />
                    Require password reset on next login
                  </label>
                  <small className="form-text">
                    If checked, user will be forced to change their password on next login
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={closeEditUserModal}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                >
                  💾 Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* System Status Modal */}
      {showSystemStatusModal && ReactDOM.createPortal(
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>📊 System Status</h2>
              <button
                className="close-button"
                onClick={() => setShowSystemStatusModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '20px' }}>
              {/* System Status Section */}
              <div style={{ marginBottom: '30px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <h3 style={{ margin: 0 }}>Connection Status</h3>
                  <button
                    onClick={checkSystemStatus}
                    disabled={statusLoading}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      background: 'white',
                      cursor: statusLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    🔄 Refresh
                  </button>
                </div>

                <div style={{ 
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '15px'
                }}>
                  {/* Backend Status */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: '8px' }}>{getStatusIcon(systemStatus.backend.status)}</span>
                      <strong>Backend Server:</strong>
                    </div>
                    <span style={{ 
                      fontWeight: 'bold',
                      color: getStatusColor(systemStatus.backend.status),
                    }}>
                      {systemStatus.backend.status === 'connected' ? 'Connected' : 
                       systemStatus.backend.status === 'error' ? 'Error' : 
                       systemStatus.backend.status === 'checking' ? 'Checking...' : 'Disconnected'}
                    </span>
                  </div>

                  {/* Database Status */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: '8px' }}>{getStatusIcon(systemStatus.database.status)}</span>
                      <strong>Database:</strong>
                    </div>
                    <span style={{ 
                      fontWeight: 'bold',
                      color: getStatusColor(systemStatus.database.status),
                    }}>
                      {systemStatus.database.status === 'connected' ? 'Connected' : 
                       systemStatus.database.status === 'error' ? 'Error' : 
                       systemStatus.database.status === 'checking' ? 'Checking...' : 'Disconnected'}
                    </span>
                  </div>

                  {/* Status Messages */}
                  {(systemStatus.backend.message || systemStatus.database.message) && (
                    <div style={{ 
                      marginTop: '15px',
                      padding: '10px',
                      background: '#f8f9fa',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}>
                      {systemStatus.backend.message && (
                        <div style={{ marginBottom: systemStatus.database.message ? '8px' : '0' }}>
                          <strong>Backend:</strong> {systemStatus.backend.message}
                        </div>
                      )}
                      {systemStatus.database.message && (
                        <div>
                          <strong>Database:</strong> {systemStatus.database.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowSystemStatusModal(false)}
                className="btn btn-secondary"
              >
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

export default GlobalModals;

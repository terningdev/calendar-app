import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'react-toastify';
import { useAdmin } from '../contexts/AdminContext';
import { useAuth } from '../contexts/AuthContext';
import userService from '../services/userService';
import authService from '../services/authService';
import { statusService } from '../services/statusService';
import permissionsService from '../services/permissionsService';
import bugReportService from '../services/bugReportService';

const GlobalModals = () => {
  const { user, checkAuthStatus } = useAuth();
  const { setPendingUserCount, setBugReportCount, setOpenPendingUsersModal, setOpenManageUsersModal, setOpenSystemStatusModal, setOpenManagePermissionsModal, setOpenBugReportsModal } = useAdmin();
  
  const [showPendingUsersModal, setShowPendingUsersModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showSystemStatusModal, setShowSystemStatusModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showBugReportsModal, setShowBugReportsModal] = useState(false);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [bugReports, setBugReports] = useState([]);
  const [loadingBugReports, setLoadingBugReports] = useState(false);
  const [expandedBugReportId, setExpandedBugReportId] = useState(null);
  
  // System Status state
  const [systemStatus, setSystemStatus] = useState({
    backend: { status: 'checking', message: 'Checking connection...' },
    database: { status: 'checking', message: 'Checking connection...' }
  });
  const [statusLoading, setStatusLoading] = useState(false);
  
  // Permissions modal state
  const [allPermissions, setAllPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [editedPermissions, setEditedPermissions] = useState({});
  const [selectedRole, setSelectedRole] = useState('');
  
  // Create role modal state
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [basedOnRole, setBasedOnRole] = useState('user');
  const [creatingRole, setCreatingRole] = useState(false);
  
  // Rename role modal state
  const [showRenameRoleModal, setShowRenameRoleModal] = useState(false);
  const [renameRoleName, setRenameRoleName] = useState('');
  const [renamingRole, setRenamingRole] = useState(false);
  
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
    // Only load if user has permission (administrator or sysadmin)
    if (!user || (user.role !== 'administrator' && user.role !== 'sysadmin')) {
      return;
    }
    
    try {
      const response = await authService.getPendingUsers();
      const usersArray = Array.isArray(response) ? response : (response?.pendingUsers || []);
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

  const openPermissionsModal = () => {
    console.log('GlobalModals: Opening Manage RBAC Modal');
    setShowPermissionsModal(true);
    loadAllPermissions();
  };

  const openBugReportsModal = () => {
    console.log('GlobalModals: Opening Bug Reports Modal');
    setShowBugReportsModal(true);
    loadBugReports();
  };

  const loadBugReportsCount = async () => {
    // Only load if user has viewBugReports permission
    if (!user?.permissions?.viewBugReports) {
      return;
    }
    
    try {
      const count = await bugReportService.getCount();
      setBugReportCount(count);
    } catch (error) {
      console.error('Failed to load bug reports count:', error);
    }
  };

  const loadBugReports = async () => {
    setLoadingBugReports(true);
    try {
      const reports = await bugReportService.getAll();
      setBugReports(reports);
    } catch (error) {
      console.error('Error loading bug reports:', error);
      toast.error('Failed to load bug reports');
    } finally {
      setLoadingBugReports(false);
    }
  };

  const handleDeleteBugReport = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bug report?')) {
      return;
    }

    try {
      await bugReportService.delete(id);
      toast.success('Bug report deleted successfully');
      loadBugReports(); // Reload list
      loadBugReportsCount(); // Update count
    } catch (error) {
      console.error('Error deleting bug report:', error);
      toast.error('Failed to delete bug report');
    }
  };

  const toggleBugReportExpand = (id) => {
    setExpandedBugReportId(expandedBugReportId === id ? null : id);
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
      // Ensure we have an array - backend returns { success: true, pendingUsers: [...] }
      const usersArray = Array.isArray(response) ? response : (response?.pendingUsers || []);
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

  const loadAllPermissions = async () => {
    try {
      setLoadingPermissions(true);
      const response = await permissionsService.getAllPermissions();
      console.log('getAllPermissions response:', response);
      const permissionsArray = Array.isArray(response) ? response : (response?.permissions || []);
      setAllPermissions(permissionsArray);
      // Initialize editedPermissions state
      const initialEdited = {};
      permissionsArray.forEach(rolePerms => {
        initialEdited[rolePerms.role] = { ...rolePerms.permissions };
      });
      setEditedPermissions(initialEdited);
      // Set default selected role to technician if available
      if (permissionsArray.length > 0) {
        const techRole = permissionsArray.find(r => r.role === 'technician');
        setSelectedRole(techRole ? 'technician' : permissionsArray[0].role);
      }
    } catch (error) {
      toast.error('Failed to load permissions');
      console.error('Error loading permissions:', error);
      setAllPermissions([]);
    } finally {
      setLoadingPermissions(false);
    }
  };

  // Register modal openers with AdminContext
  useEffect(() => {
    setOpenPendingUsersModal(() => openPendingUsersModal);
    setOpenManageUsersModal(() => openUsersModal);
    setOpenSystemStatusModal(() => openSystemStatusModal);
    setOpenManagePermissionsModal(() => openPermissionsModal);
    setOpenBugReportsModal(() => openBugReportsModal);
    
    return () => {
      setOpenPendingUsersModal(null);
      setOpenManageUsersModal(null);
      setOpenSystemStatusModal(null);
      setOpenManagePermissionsModal(null);
      setOpenBugReportsModal(null);
    };
  }, [setOpenPendingUsersModal, setOpenManageUsersModal, setOpenSystemStatusModal, setOpenManagePermissionsModal, setOpenBugReportsModal]);

  // Load pending users count and bug reports count on mount
  useEffect(() => {
    loadPendingUsersCount();
    loadBugReportsCount();
  }, [user]);

  const handleApproveUser = async (email) => {
    try {
      await authService.approveUser(email);
      toast.success('User approved successfully');
      // Reload both the full list and the count
      await loadPendingUsers();
      await loadPendingUsersCount();
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
      // Reload both the full list and the count
      await loadPendingUsers();
      await loadPendingUsersCount();
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
      requirePasswordReset: userToEdit.requirePasswordReset || false,
      temporaryPassword: ''
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
      requirePasswordReset: false,
      temporaryPassword: ''
    });
  };

  const handlePermissionChange = (role, permissionKey, value) => {
    setEditedPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permissionKey]: value
      }
    }));
  };

  const handleSavePermissions = async (role) => {
    try {
      await permissionsService.updateRolePermissions(role, editedPermissions[role]);
      toast.success(`Permissions updated for ${role} role`);
      loadAllPermissions(); // Reload to get updated data
    } catch (error) {
      toast.error(error.message || 'Failed to update permissions');
    }
  };

  const handleResetPermissions = async (role) => {
    if (!window.confirm(`Reset ${role} permissions to defaults? This cannot be undone.`)) {
      return;
    }
    try {
      await permissionsService.resetRolePermissions(role);
      toast.success(`Permissions reset to defaults for ${role} role`);
      loadAllPermissions(); // Reload to get updated data
    } catch (error) {
      toast.error(error.message || 'Failed to reset permissions');
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('Please enter a role name');
      return;
    }
    
    setCreatingRole(true);
    try {
      await permissionsService.createRole(newRoleName.trim(), basedOnRole);
      toast.success(`Role '${newRoleName}' created successfully`);
      setShowCreateRoleModal(false);
      setNewRoleName('');
      setBasedOnRole('user');
      loadAllPermissions(); // Reload to get updated data including new role
    } catch (error) {
      toast.error(error.message || 'Failed to create role');
    } finally {
      setCreatingRole(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (role === 'sysadmin') {
      toast.error('Cannot delete sysadmin role');
      return;
    }
    
    if (!window.confirm(`Delete the role '${role}'? This cannot be undone.`)) {
      return;
    }
    
    try {
      await permissionsService.deleteRole(role);
      toast.success(`Role '${role}' deleted successfully`);
      setSelectedRole('');
      loadAllPermissions(); // Reload to get updated data
    } catch (error) {
      toast.error(error.message || 'Failed to delete role');
    }
  };

  const handleRenameRole = async () => {
    if (!renameRoleName.trim()) {
      toast.error('Please enter a new role name');
      return;
    }
    
    if (renameRoleName.trim() === selectedRole) {
      toast.error('New name must be different from current name');
      return;
    }
    
    setRenamingRole(true);
    try {
      const response = await permissionsService.renameRole(selectedRole, renameRoleName.trim());
      toast.success(response.message || `Role renamed successfully. ${response.usersUpdated || 0} user(s) updated.`);
      setShowRenameRoleModal(false);
      setRenameRoleName('');
      setSelectedRole(renameRoleName.trim()); // Update selected role to new name
      loadAllPermissions(); // Reload to get updated data
    } catch (error) {
      toast.error(error.message || 'Failed to rename role');
    } finally {
      setRenamingRole(false);
    }
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
      
      // If the updated user is the current user, refresh auth status to get updated role/permissions
      if (user && (user.email === editingUser.email || user.username === editingUser.username)) {
        await checkAuthStatus();
      }
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
                  <label className="form-label">Password Reset</label>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      backgroundColor: userFormData.requirePasswordReset ? '#f44336' : '#2196F3',
                      color: 'white',
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      width: '100%'
                    }}
                    onClick={() => setUserFormData(prev => ({ 
                      ...prev, 
                      requirePasswordReset: !prev.requirePasswordReset 
                    }))}
                  >
                    {userFormData.requirePasswordReset 
                      ? '✓ Password Reset Required - Click to Cancel' 
                      : 'Request Password Reset'}
                  </button>
                  <small className="form-text">
                    {userFormData.requirePasswordReset 
                      ? 'User will be forced to change password on next login' 
                      : 'Click to require user to change password on next login'}
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Set Temporary Password (Optional)</label>
                  <input
                    type="password"
                    name="temporaryPassword"
                    className="form-input"
                    value={userFormData.temporaryPassword}
                    onChange={handleUserFormChange}
                    placeholder="Leave empty to keep current password"
                    autoComplete="new-password"
                  />
                  <small className="form-text">
                    If set, user will be forced to change this password on next login. Minimum 6 characters.
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

      {/* Manage RBAC Modal */}
      {showPermissionsModal && ReactDOM.createPortal(
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
          }}
        >
          <div className="modal-content" style={{ 
            maxWidth: '900px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div className="modal-header">
              <h2 className="modal-title">🔐 Manage RBAC (Role-Based Access Control)</h2>
              <button className="modal-close" onClick={() => setShowPermissionsModal(false)}>×</button>
            </div>

            <div className="modal-body">
              {loadingPermissions ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p>Loading permissions...</p>
                </div>
              ) : (
                <div>
                  <p style={{ marginBottom: '20px', color: '#666' }}>
                    Configure what each role can view and do in the application. Changes take effect immediately for all users with that role.
                  </p>

                  {/* Role Selection Dropdown */}
                  <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'flex-end', gap: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '10px', 
                        fontWeight: 'bold',
                        fontSize: '1.1rem'
                      }}>
                        Select Role to Edit:
                      </label>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="form-control"
                        style={{ 
                          fontSize: '1rem',
                          padding: '10px',
                          maxWidth: '300px'
                        }}
                      >
                        <option value="">-- Select a Role --</option>
                        {allPermissions.map((rolePerms) => (
                          <option key={rolePerms.role} value={rolePerms.role}>
                            {rolePerms.role === 'user' && '👤 '}
                            {rolePerms.role === 'technician' && '🔧 '}
                            {rolePerms.role === 'administrator' && '👑 '}
                            {rolePerms.role === 'sysadmin' && '⚙️ '}
                            {rolePerms.isCustomRole && '✨ '}
                            {rolePerms.role.charAt(0).toUpperCase() + rolePerms.role.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => setShowCreateRoleModal(true)}
                      className="btn btn-primary"
                      style={{
                        padding: '10px 20px',
                        fontSize: '0.95rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      ➕ Create Role
                    </button>
                  </div>

                  {/* Permissions for Selected Role */}
                  {selectedRole && editedPermissions[selectedRole] && (
                    <div 
                      style={{
                        padding: '25px',
                        border: '2px solid #3498db',
                        borderRadius: '8px',
                        backgroundColor: '#f8f9fa'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '20px',
                        paddingBottom: '15px',
                        borderBottom: '2px solid #dee2e6'
                      }}>
                        <h3 style={{ 
                          margin: 0,
                          textTransform: 'capitalize',
                          fontSize: '1.3rem',
                          color: '#2c3e50'
                        }}>
                          {selectedRole === 'user' && '👤 '}
                          {selectedRole === 'technician' && '🔧 '}
                          {selectedRole === 'administrator' && '👑 '}
                          {selectedRole === 'sysadmin' && '⚙️ '}
                          {selectedRole} Permissions
                        </h3>
                        <div>
                          <button
                            onClick={() => handleSavePermissions(selectedRole)}
                            className="btn btn-primary"
                            style={{ marginRight: '10px' }}
                            disabled={selectedRole === 'sysadmin'}
                          >
                            💾 Save Changes
                          </button>
                          <button
                            onClick={() => handleResetPermissions(selectedRole)}
                            className="btn btn-secondary"
                            style={{ marginRight: '10px' }}
                            disabled={selectedRole === 'sysadmin'}
                          >
                            🔄 Reset to Defaults
                          </button>
                          {selectedRole !== 'sysadmin' && (
                            <>
                              <button
                                onClick={() => setShowRenameRoleModal(true)}
                                className="btn btn-secondary"
                                style={{ marginRight: '10px' }}
                              >
                                ✏️ Rename Role
                              </button>
                              <button
                                onClick={() => handleDeleteRole(selectedRole)}
                                className="btn btn-danger"
                              >
                                🗑️ Delete Role
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {selectedRole === 'sysadmin' && (
                        <div style={{
                          padding: '15px',
                          backgroundColor: '#fff3cd',
                          border: '1px solid #ffc107',
                          borderRadius: '6px',
                          marginBottom: '20px',
                          color: '#856404'
                        }}>
                          <strong>⚠️ Note:</strong> Sysadmin permissions cannot be modified. Sysadmin role has all permissions by default.
                        </div>
                      )}

                      {/* Tab/Page Visibility Section */}
                      <div style={{ marginBottom: '25px' }}>
                        <h4 style={{ 
                          fontSize: '1.1rem', 
                          color: '#2c3e50', 
                          marginBottom: '15px',
                          paddingBottom: '10px',
                          borderBottom: '1px solid #dee2e6'
                        }}>
                          📊 Tab Visibility
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: selectedRole === 'sysadmin' ? 'not-allowed' : 'pointer',
                            padding: '10px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRole === 'sysadmin' ? true : (editedPermissions[selectedRole].viewDashboard || false)}
                              onChange={(e) => handlePermissionChange(selectedRole, 'viewDashboard', e.target.checked)}
                              disabled={selectedRole === 'sysadmin'}
                              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ fontSize: '0.95rem' }}>View Dashboard</span>
                          </label>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: selectedRole === 'sysadmin' ? 'not-allowed' : 'pointer',
                            padding: '10px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRole === 'sysadmin' ? true : (editedPermissions[selectedRole].viewCalendar || false)}
                              onChange={(e) => handlePermissionChange(selectedRole, 'viewCalendar', e.target.checked)}
                              disabled={selectedRole === 'sysadmin'}
                              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ fontSize: '0.95rem' }}>View Calendar</span>
                          </label>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: selectedRole === 'sysadmin' ? 'not-allowed' : 'pointer',
                            padding: '10px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRole === 'sysadmin' ? true : (editedPermissions[selectedRole].viewTickets || false)}
                              onChange={(e) => handlePermissionChange(selectedRole, 'viewTickets', e.target.checked)}
                              disabled={selectedRole === 'sysadmin'}
                              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ fontSize: '0.95rem' }}>View Tickets</span>
                          </label>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: selectedRole === 'sysadmin' ? 'not-allowed' : 'pointer',
                            padding: '10px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRole === 'sysadmin' ? true : (editedPermissions[selectedRole].viewAdministrator || false)}
                              onChange={(e) => handlePermissionChange(selectedRole, 'viewAdministrator', e.target.checked)}
                              disabled={selectedRole === 'sysadmin'}
                              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ fontSize: '0.95rem' }}>View Administrator (Departments & Technicians)</span>
                          </label>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: selectedRole === 'sysadmin' ? 'not-allowed' : 'pointer',
                            padding: '10px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRole === 'sysadmin' ? true : (editedPermissions[selectedRole].viewAbsences || false)}
                              onChange={(e) => handlePermissionChange(selectedRole, 'viewAbsences', e.target.checked)}
                              disabled={selectedRole === 'sysadmin'}
                              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ fontSize: '0.95rem' }}>View Absence & On call</span>
                          </label>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: selectedRole === 'sysadmin' ? 'not-allowed' : 'pointer',
                            padding: '10px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRole === 'sysadmin' ? true : (editedPermissions[selectedRole].viewSkills || false)}
                              onChange={(e) => handlePermissionChange(selectedRole, 'viewSkills', e.target.checked)}
                              disabled={selectedRole === 'sysadmin'}
                              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ fontSize: '0.95rem' }}>View Skills</span>
                          </label>
                        </div>
                      </div>

                      {/* User Menu Permissions Section */}
                      <div style={{ marginBottom: '25px' }}>
                        <h4 style={{ 
                          fontSize: '1.1rem', 
                          color: '#2c3e50', 
                          marginBottom: '15px',
                          paddingBottom: '10px',
                          borderBottom: '1px solid #dee2e6'
                        }}>
                          👤 User Menu Access
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: selectedRole === 'sysadmin' ? 'not-allowed' : 'pointer',
                            padding: '10px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRole === 'sysadmin' ? true : (editedPermissions[selectedRole].approveUsers || false)}
                              onChange={(e) => handlePermissionChange(selectedRole, 'approveUsers', e.target.checked)}
                              disabled={selectedRole === 'sysadmin'}
                              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ fontSize: '0.95rem' }}>View "Pending Users"</span>
                          </label>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: selectedRole === 'sysadmin' ? 'not-allowed' : 'pointer',
                            padding: '10px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRole === 'sysadmin' ? true : (editedPermissions[selectedRole].manageUsers || false)}
                              onChange={(e) => handlePermissionChange(selectedRole, 'manageUsers', e.target.checked)}
                              disabled={selectedRole === 'sysadmin'}
                              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ fontSize: '0.95rem' }}>View "Manage Users"</span>
                          </label>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: selectedRole === 'sysadmin' ? 'not-allowed' : 'pointer',
                            padding: '10px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRole === 'sysadmin' ? true : (editedPermissions[selectedRole].managePermissions || false)}
                              onChange={(e) => handlePermissionChange(selectedRole, 'managePermissions', e.target.checked)}
                              disabled={selectedRole === 'sysadmin'}
                              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ fontSize: '0.95rem' }}>View "Manage RBAC"</span>
                          </label>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: selectedRole === 'sysadmin' ? 'not-allowed' : 'pointer',
                            padding: '10px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRole === 'sysadmin' ? true : (editedPermissions[selectedRole].viewSystemStatus || false)}
                              onChange={(e) => handlePermissionChange(selectedRole, 'viewSystemStatus', e.target.checked)}
                              disabled={selectedRole === 'sysadmin'}
                              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ fontSize: '0.95rem' }}>View "System Status"</span>
                          </label>
                        </div>
                      </div>

                      {/* Ticket Permissions Section */}
                      <div style={{ marginBottom: '25px' }}>
                        <h4 style={{ 
                          fontSize: '1.1rem', 
                          color: '#2c3e50', 
                          marginBottom: '15px',
                          paddingBottom: '10px',
                          borderBottom: '1px solid #dee2e6'
                        }}>
                          🎫 Ticket Permissions
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: selectedRole === 'sysadmin' ? 'not-allowed' : 'pointer',
                            padding: '10px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRole === 'sysadmin' ? true : (editedPermissions[selectedRole].createTickets || false)}
                              onChange={(e) => handlePermissionChange(selectedRole, 'createTickets', e.target.checked)}
                              disabled={selectedRole === 'sysadmin'}
                              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ fontSize: '0.95rem' }}>Create Tickets</span>
                          </label>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: selectedRole === 'sysadmin' ? 'not-allowed' : 'pointer',
                            padding: '10px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRole === 'sysadmin' ? true : (editedPermissions[selectedRole].editOwnTickets || false)}
                              onChange={(e) => handlePermissionChange(selectedRole, 'editOwnTickets', e.target.checked)}
                              disabled={selectedRole === 'sysadmin'}
                              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ fontSize: '0.95rem' }}>Edit Own Tickets</span>
                          </label>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: selectedRole === 'sysadmin' ? 'not-allowed' : 'pointer',
                            padding: '10px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRole === 'sysadmin' ? true : (editedPermissions[selectedRole].editAllTickets || false)}
                              onChange={(e) => handlePermissionChange(selectedRole, 'editAllTickets', e.target.checked)}
                              disabled={selectedRole === 'sysadmin'}
                              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ fontSize: '0.95rem' }}>Edit All Tickets</span>
                          </label>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: selectedRole === 'sysadmin' ? 'not-allowed' : 'pointer',
                            padding: '10px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRole === 'sysadmin' ? true : (editedPermissions[selectedRole].deleteTickets || false)}
                              onChange={(e) => handlePermissionChange(selectedRole, 'deleteTickets', e.target.checked)}
                              disabled={selectedRole === 'sysadmin'}
                              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ fontSize: '0.95rem' }}>Delete Tickets</span>
                          </label>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: selectedRole === 'sysadmin' ? 'not-allowed' : 'pointer',
                            padding: '10px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRole === 'sysadmin' ? true : (editedPermissions[selectedRole].assignTickets || false)}
                              onChange={(e) => handlePermissionChange(selectedRole, 'assignTickets', e.target.checked)}
                              disabled={selectedRole === 'sysadmin'}
                              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ fontSize: '0.95rem' }}>Assign Tickets</span>
                          </label>
                        </div>
                      </div>

                      {/* Administrative Permissions Section */}
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ 
                          fontSize: '1.1rem', 
                          color: '#2c3e50', 
                          marginBottom: '15px',
                          paddingBottom: '10px',
                          borderBottom: '1px solid #dee2e6'
                        }}>
                          ⚙️ Administrative Permissions
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: selectedRole === 'sysadmin' ? 'not-allowed' : 'pointer',
                            padding: '10px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRole === 'sysadmin' ? true : (editedPermissions[selectedRole].manageDepartments || false)}
                              onChange={(e) => handlePermissionChange(selectedRole, 'manageDepartments', e.target.checked)}
                              disabled={selectedRole === 'sysadmin'}
                              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ fontSize: '0.95rem' }}>Manage Departments</span>
                          </label>
                          <label style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: selectedRole === 'sysadmin' ? 'not-allowed' : 'pointer',
                            padding: '10px',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            border: '1px solid #dee2e6'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedRole === 'sysadmin' ? true : (editedPermissions[selectedRole].manageTechnicians || false)}
                              onChange={(e) => handlePermissionChange(selectedRole, 'manageTechnicians', e.target.checked)}
                              disabled={selectedRole === 'sysadmin'}
                              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ fontSize: '0.95rem' }}>Manage Technicians</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {!selectedRole && (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px',
                      color: '#999',
                      fontSize: '1.1rem'
                    }}>
                      Please select a role from the dropdown above to view and edit permissions.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowPermissionsModal(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Role Modal */}
      {showCreateRoleModal && ReactDOM.createPortal(
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
            zIndex: 10001
          }}
        >
          <div className="modal-content" style={{ 
            maxWidth: '500px',
            width: '90%'
          }}>
            <div className="modal-header">
              <h2 className="modal-title">✨ Create New Role</h2>
              <button className="modal-close" onClick={() => setShowCreateRoleModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold'
                }}>
                  Role Name:
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., manager, supervisor, viewer"
                  style={{ 
                    fontSize: '1rem',
                    padding: '10px'
                  }}
                />
                <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                  Only letters, numbers, underscores, and hyphens allowed
                </small>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold'
                }}>
                  Base Permissions On:
                </label>
                <select
                  className="form-control"
                  value={basedOnRole}
                  onChange={(e) => setBasedOnRole(e.target.value)}
                  style={{ 
                    fontSize: '1rem',
                    padding: '10px'
                  }}
                >
                  <option value="user">👤 User (Minimal permissions)</option>
                  <option value="technician">🔧 Technician (Basic permissions)</option>
                  <option value="administrator">👑 Administrator (Full permissions)</option>
                  <option value="sysadmin">⚙️ Sysadmin (All permissions)</option>
                </select>
                <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                  The new role will start with these permissions, which you can then customize
                </small>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowCreateRoleModal(false)}
                className="btn btn-secondary"
                disabled={creatingRole}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateRole}
                className="btn btn-primary"
                disabled={creatingRole || !newRoleName.trim()}
              >
                {creatingRole ? 'Creating...' : '✨ Create Role'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Rename Role Modal */}
      {showRenameRoleModal && ReactDOM.createPortal(
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
            zIndex: 10001
          }}
        >
          <div className="modal-content" style={{ 
            maxWidth: '500px',
            width: '90%'
          }}>
            <div className="modal-header">
              <h2 className="modal-title">✏️ Rename Role</h2>
              <button className="modal-close" onClick={() => {
                setShowRenameRoleModal(false);
                setRenameRoleName('');
              }}>×</button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold'
                }}>
                  Current Role Name:
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={selectedRole}
                  disabled
                  style={{ 
                    fontSize: '1rem',
                    padding: '10px',
                    backgroundColor: 'var(--bg-secondary)',
                    cursor: 'not-allowed'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold'
                }}>
                  New Role Name:
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={renameRoleName}
                  onChange={(e) => setRenameRoleName(e.target.value)}
                  placeholder="Enter new role name"
                  style={{ 
                    fontSize: '1rem',
                    padding: '10px'
                  }}
                />
                <small style={{ color: 'var(--text-secondary)', marginTop: '5px', display: 'block' }}>
                  Only letters, numbers, underscores, and hyphens allowed
                </small>
              </div>

              <div style={{
                padding: '15px',
                backgroundColor: 'var(--accent-bg)',
                border: '1px solid var(--accent-border)',
                borderRadius: '6px',
                marginBottom: '10px'
              }}>
                <div style={{ color: 'var(--accent-text)', fontSize: '0.9rem' }}>
                  ℹ️ <strong>Important:</strong> All users currently assigned the "{selectedRole}" role will automatically be updated to the new role name. Their permissions will remain unchanged.
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => {
                  setShowRenameRoleModal(false);
                  setRenameRoleName('');
                }}
                className="btn btn-secondary"
                disabled={renamingRole}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenameRole}
                className="btn btn-primary"
                disabled={renamingRole || !renameRoleName.trim()}
              >
                {renamingRole ? 'Renaming...' : '✏️ Rename Role'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bug Reports Modal */}
      {showBugReportsModal && ReactDOM.createPortal(
        <div className="modal">
          <div className="modal-content" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h2>🐛 Bug Reports</h2>
              <button onClick={() => setShowBugReportsModal(false)} className="modal-close">×</button>
            </div>

            <div className="modal-body" style={{ maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
              {loadingBugReports ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p>Loading bug reports...</p>
                </div>
              ) : bugReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <p>No bug reports yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {bugReports.map((report) => (
                    <div 
                      key={report._id} 
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '12px',
                        backgroundColor: 'var(--card-background)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontSize: '0.9rem', 
                            color: 'var(--text-secondary)',
                            marginBottom: '4px'
                          }}>
                            <strong>{report.submittedByName}</strong>
                            {' • '}
                            {new Date(report.createdAt).toLocaleString()}
                          </div>
                          <div 
                            style={{
                              cursor: 'pointer',
                              padding: '8px 0',
                              userSelect: 'none'
                            }}
                            onClick={() => toggleBugReportExpand(report._id)}
                          >
                            <span style={{ marginRight: '8px' }}>
                              {expandedBugReportId === report._id ? '▼' : '▶'}
                            </span>
                            <span style={{ fontWeight: '500' }}>
                              {expandedBugReportId === report._id ? 'Hide Details' : 'Show Details'}
                            </span>
                          </div>
                          {expandedBugReportId === report._id && (
                            <div 
                              style={{
                                marginTop: '8px',
                                padding: '12px',
                                backgroundColor: 'var(--background-color)',
                                borderRadius: '4px',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                maxHeight: '300px',
                                overflowY: 'auto'
                              }}
                            >
                              {report.message}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteBugReport(report._id)}
                          className="btn btn-small btn-danger"
                          style={{
                            marginLeft: '12px',
                            padding: '6px 12px',
                            fontSize: '0.85rem'
                          }}
                        >
                          Delete
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
                onClick={() => setShowBugReportsModal(false)}
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

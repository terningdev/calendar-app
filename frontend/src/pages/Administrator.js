import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'react-toastify';
import { departmentService } from '../services/departmentService';
import { technicianService } from '../services/technicianService';
import { statusService } from '../services/statusService';
import { useTranslation } from '../utils/translations';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import authService from '../services/authService';
import userService from '../services/userService';

const Administrator = () => {
  const { user, canApproveUsers } = useAuth();
  const { setPendingUserCount, setOpenPendingUsersModal, setOpenManageUsersModal } = useAdmin();
  
  // Check if user has administrator or sysadmin role
  const isAdminOrSysadmin = user && (user.role === 'administrator' || user.role === 'sysadmin');

  // Department state
  const [departments, setDepartments] = useState([]);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [departmentFormData, setDepartmentFormData] = useState({
    name: '',
    description: '',
    isActive: true
  });

  // Pending users state
  const [pendingUsers, setPendingUsers] = useState([]);
  const [showPendingUsersModal, setShowPendingUsersModal] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // All users management state
  const [allUsers, setAllUsers] = useState([]);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    role: 'user',
    requirePasswordReset: false
  });

  // Technician state
  const [technicians, setTechnicians] = useState([]);
  const [showTechnicianModal, setShowTechnicianModal] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState(null);
  const [technicianFormData, setTechnicianFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    skills: [],
    isActive: true
  });
  const [skillInput, setSkillInput] = useState('');

  // General state
  const [loading, setLoading] = useState(true);

  // Settings state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showConsoleModal, setShowConsoleModal] = useState(false);
  const [showColorSettingsModal, setShowColorSettingsModal] = useState(false);
  const [consoleErrors, setConsoleErrors] = useState([]);
  const { t } = useTranslation();

  // Color settings state
  const [colorSettings, setColorSettings] = useState({
    unassignedTickets: localStorage.getItem('color-unassigned-tickets') || '#e74c3c',
    assignedTickets: localStorage.getItem('color-assigned-tickets') || '#27ae60',
    absence: localStorage.getItem('color-absence') || '#e67e22',
    vakt: localStorage.getItem('color-vakt') || '#9b59b6'
  });

  // System status state
  const [systemStatus, setSystemStatus] = useState({
    backend: { status: 'checking', message: 'Checking connection...' },
    database: { status: 'checking', message: 'Checking connection...' }
  });
  const [statusLoading, setStatusLoading] = useState(false);

  // Technician filter state
  const [selectedDepartment, setSelectedDepartment] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // Console error capturing
  useEffect(() => {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      const timestamp = new Date().toLocaleString();
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setConsoleErrors(prev => [{
        type: 'error',
        timestamp,
        message,
        id: Date.now() + Math.random()
      }, ...prev].slice(0, 100)); // Keep only last 100 errors
    };
    
    console.warn = (...args) => {
      originalConsoleWarn.apply(console, args);
      const timestamp = new Date().toLocaleString();
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setConsoleErrors(prev => [{
        type: 'warning',
        timestamp,
        message,
        id: Date.now() + Math.random()
      }, ...prev].slice(0, 100)); // Keep only last 100 errors
    };

    // Capture unhandled errors
    const handleError = (event) => {
      const timestamp = new Date().toLocaleString();
      setConsoleErrors(prev => [{
        type: 'error',
        timestamp,
        message: `${event.error?.message || event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
        id: Date.now() + Math.random()
      }, ...prev].slice(0, 100));
    };

    window.addEventListener('error', handleError);

    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Set up admin context modal handlers
  useEffect(() => {
    setOpenPendingUsersModal(() => openPendingUsersModal);
    setOpenManageUsersModal(() => openUsersModal);
    
    return () => {
      setOpenPendingUsersModal(null);
      setOpenManageUsersModal(null);
    };
  }, [setOpenPendingUsersModal, setOpenManageUsersModal]);

  // Update pending user count in admin context
  useEffect(() => {
    setPendingUserCount(pendingUsers.length);
  }, [pendingUsers.length, setPendingUserCount]);

  // Access check - must be after all hooks
  if (!isAdminOrSysadmin) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
        <p>Administrator or Sysadmin role required.</p>
      </div>
    );
  }

  const loadData = async () => {
    try {
      setLoading(true);
      const [departmentsData, techniciansData] = await Promise.all([
        departmentService.getAll(),
        technicianService.getAll()
      ]);
      setDepartments(departmentsData);
      setTechnicians(techniciansData);
      
      // Set Trondheim as default selected department if it exists
      if (!selectedDepartment && departmentsData.length > 0) {
        const trondheimDept = departmentsData.find(dept => 
          dept.name.toLowerCase().includes('trondheim')
        );
        if (trondheimDept) {
          setSelectedDepartment(trondheimDept._id);
        }
      }

      // Load pending users if user can approve
      console.log('🔄 Initial load - canApproveUsers():', canApproveUsers());
      if (canApproveUsers()) {
        console.log('✅ Loading pending users on initial load');
        await loadPendingUsers();
      } else {
        console.log('❌ Cannot approve users, skipping pending users load');
      }
    } catch (error) {
      toast.error('Error loading data');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to filter technicians by department
  const getFilteredTechnicians = () => {
    let filteredTechnicians;
    if (!selectedDepartment) {
      filteredTechnicians = technicians;
    } else {
      filteredTechnicians = technicians.filter(technician => 
        technician.department && technician.department._id === selectedDepartment
      );
    }
    
    // Sort technicians alphabetically by first name
    return filteredTechnicians.sort((a, b) => 
      a.firstName.localeCompare(b.firstName)
    );
  };

  // Department handlers
  const handleDepartmentSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingDepartment) {
        await departmentService.update(editingDepartment._id, departmentFormData);
        toast.success('Department updated successfully');
      } else {
        await departmentService.create(departmentFormData);
        toast.success('Department created successfully');
      }
      
      closeDepartmentModal();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving department');
    }
  };

  const handleDepartmentEdit = (department) => {
    setEditingDepartment(department);
    setDepartmentFormData({
      name: department.name,
      description: department.description || '',
      isActive: department.isActive
    });
    setShowDepartmentModal(true);
  };

  const handleDepartmentDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        await departmentService.delete(id);
        toast.success('Department deleted successfully');
        loadData();
      } catch (error) {
        toast.error('Error deleting department');
      }
    }
  };

  const openCreateDepartmentModal = () => {
    setEditingDepartment(null);
    setDepartmentFormData({ name: '', description: '', isActive: true });
    setShowDepartmentModal(true);
  };

  const closeDepartmentModal = () => {
    setShowDepartmentModal(false);
    setEditingDepartment(null);
    setDepartmentFormData({ name: '', description: '', isActive: true });
  };

  // Technician handlers
  const handleTechnicianSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingTechnician) {
        await technicianService.update(editingTechnician._id, technicianFormData);
        toast.success('Technician updated successfully');
      } else {
        await technicianService.create(technicianFormData);
        toast.success('Technician created successfully');
      }
      
      closeTechnicianModal();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving technician');
    }
  };

  const handleTechnicianEdit = (technician) => {
    setEditingTechnician(technician);
    setTechnicianFormData({
      firstName: technician.firstName,
      lastName: technician.lastName,
      email: technician.email,
      phone: technician.phone || '',
      department: technician.department._id,
      skills: technician.skills || [],
      isActive: technician.isActive
    });
    setShowTechnicianModal(true);
  };

  const handleTechnicianDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this technician?')) {
      try {
        await technicianService.delete(id);
        toast.success('Technician deleted successfully');
        loadData();
      } catch (error) {
        toast.error('Error deleting technician');
      }
    }
  };

  // Pending users functions
  const loadPendingUsers = async () => {
    console.log('🔄 loadPendingUsers called');
    console.log('🔄 canApproveUsers():', canApproveUsers());
    
    if (!canApproveUsers()) {
      console.log('❌ User cannot approve users, skipping load');
      return;
    }
    
    try {
      console.log('🔄 Loading pending users...');
      setLoadingUsers(true);
      const response = await authService.getPendingUsers();
      console.log('🔄 Pending users response:', response);
      if (response.success) {
        console.log('✅ Setting pending users:', response.pendingUsers || []);
        setPendingUsers(response.pendingUsers || []);
      }
    } catch (error) {
      console.error('🚨 Error loading pending users:', error);
      toast.error('Error loading pending users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleApproveUser = async (email) => {
    try {
      const response = await authService.approveUser(email);
      if (response.success) {
        toast.success(response.message || 'User approved successfully');
        await loadPendingUsers(); // Reload the list
      }
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error(error.message || 'Error approving user');
    }
  };

  const handleRejectUser = async (email) => {
    if (window.confirm('Are you sure you want to reject this user registration?')) {
      try {
        const response = await authService.rejectUser(email);
        if (response.success) {
          toast.success(response.message || 'User registration rejected');
          await loadPendingUsers(); // Reload the list
        }
      } catch (error) {
        console.error('Error rejecting user:', error);
        toast.error(error.message || 'Error rejecting user');
      }
    }
  };

  const openPendingUsersModal = () => {
    setShowPendingUsersModal(true);
    loadPendingUsers();
  };

  // User Management Functions
  const loadAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await userService.getAllUsers();
      if (response.success) {
        setAllUsers(response.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error(error.message || 'Error loading users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const openUsersModal = () => {
    setShowUsersModal(true);
    loadAllUsers();
  };

  const openEditUserModal = (userToEdit) => {
    setEditingUser(userToEdit);
    setUserFormData({
      firstName: userToEdit.firstName,
      lastName: userToEdit.lastName,
      phone: userToEdit.phone,
      email: userToEdit.email,
      role: userToEdit.role,
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
      const updateData = {
        firstName: userFormData.firstName,
        lastName: userFormData.lastName,
        phone: userFormData.phone,
        newEmail: userFormData.email !== editingUser.email ? userFormData.email : undefined,
        role: userFormData.role,
        requirePasswordReset: userFormData.requirePasswordReset,
        temporaryPassword: userFormData.temporaryPassword || undefined
      };

      // Use username for sysadmin, email for others
      const identifier = editingUser.username || editingUser.email;
      const response = await userService.updateUser(identifier, updateData);
      if (response.success) {
        toast.success(response.message || 'User updated successfully');
        closeEditUserModal();
        await loadAllUsers();
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Error updating user');
    }
  };

  const handleDeleteUser = async (userIdentifier) => {
    if (window.confirm(`Are you sure you want to delete user ${userIdentifier}? This action cannot be undone.`)) {
      try {
        const response = await userService.deleteUser(userIdentifier);
        if (response.success) {
          toast.success(response.message || 'User deleted successfully');
          await loadAllUsers();
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error(error.message || 'Error deleting user');
      }
    }
  };

  const openCreateTechnicianModal = () => {
    setEditingTechnician(null);
    setTechnicianFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      skills: [],
      isActive: true
    });
    setShowTechnicianModal(true);
  };

  const closeTechnicianModal = () => {
    setShowTechnicianModal(false);
    setEditingTechnician(null);
    setTechnicianFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      skills: [],
      isActive: true
    });
    setSkillInput('');
  };

  const addSkill = () => {
    if (skillInput.trim() && !technicianFormData.skills.includes(skillInput.trim())) {
      setTechnicianFormData({
        ...technicianFormData,
        skills: [...technicianFormData.skills, skillInput.trim()]
      });
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setTechnicianFormData({
      ...technicianFormData,
      skills: technicianFormData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  // System status functions
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

  // System Status functions
  const openSettingsModal = () => {
    setShowSettingsModal(true);
    checkSystemStatus(); // Check status when modal opens
  };

  const closeSettingsModal = () => {
    setShowSettingsModal(false);
  };

  // Console functions
  const openConsoleModal = () => {
    setShowConsoleModal(true);
  };

  const closeConsoleModal = () => {
    setShowConsoleModal(false);
  };

  const clearConsoleErrors = () => {
    setConsoleErrors([]);
  };

  const exportConsoleErrors = () => {
    const errorData = consoleErrors.map(error => 
      `[${error.timestamp}] ${error.type.toUpperCase()}: ${error.message}`
    ).join('\n');
    
    const blob = new Blob([errorData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-errors-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Color settings functions
  const openColorSettingsModal = () => {
    setShowColorSettingsModal(true);
  };

  const closeColorSettingsModal = () => {
    setShowColorSettingsModal(false);
  };

  const handleColorChange = (colorType, color) => {
    setColorSettings(prev => ({
      ...prev,
      [colorType]: color
    }));
  };

  const saveColorSettings = () => {
    // Save to localStorage as a single JSON object
    localStorage.setItem('calendarColors', JSON.stringify(colorSettings));
    
    // Dispatch custom event to notify calendar component
    window.dispatchEvent(new CustomEvent('colorSettingsChanged', { detail: colorSettings }));
    
    closeColorSettingsModal();
    toast.success('Color settings saved successfully');
  };

  const resetColorSettings = () => {
    const defaultColors = {
      unassignedTickets: '#e74c3c',
      assignedTickets: '#27ae60',
      absence: '#e67e22',
      vakt: '#9b59b6'
    };
    setColorSettings(defaultColors);
  };

  if (loading) {
    return <div className="loading">{t('loading')}</div>;
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">{t('administrator')}</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={openSettingsModal} title="System Status">
            📊 System Status
          </button>
          <button className="btn btn-primary" onClick={openCreateDepartmentModal}>
            {t('addDepartment')}
          </button>
          <button className="btn btn-success" onClick={openCreateTechnicianModal}>
            {t('addTechnician')}
          </button>
        </div>
      </div>

      {/* Departments Section */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <div className="card-header">
          <h2>{t('departments')}</h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr>
                  <td colSpan="4" className="no-data">No departments found</td>
                </tr>
              ) : (
                departments.map(department => (
                  <tr key={department._id}>
                    <td>{department.name}</td>
                    <td>{department.description || '-'}</td>
                    <td>
                      <span className={`badge ${department.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {department.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => handleDepartmentEdit(department)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDepartmentDelete(department._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technicians Section */}
      <div className="card">
        <div className="card-header">
          <h2>Technicians</h2>
        </div>
        
        {/* Department Filter */}
        <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <label className="form-label" style={{ margin: 0, minWidth: '150px', fontWeight: 'bold' }}>
              Filter by Department:
            </label>
            <select
              className="form-control"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              style={{ maxWidth: '300px', minWidth: '200px' }}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <span style={{ color: '#666', fontSize: '0.9rem', backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' }}>
              ({getFilteredTechnicians().length} {getFilteredTechnicians().length === 1 ? 'technician' : 'technicians'})
            </span>
          </div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Department</th>
                <th>Skills</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredTechnicians().length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-data">
                    {technicians.length === 0 ? 'No technicians found' : 'No technicians found in selected department'}
                  </td>
                </tr>
              ) : (
                getFilteredTechnicians().map(technician => (
                  <tr key={technician._id}>
                    <td>{technician.fullName}</td>
                    <td>{technician.email}</td>
                    <td>{technician.phone || '-'}</td>
                    <td>{technician.department?.name || 'No Department'}</td>
                    <td>
                      {technician.skills && technician.skills.length > 0 ? (
                        <div className="skills">
                          {technician.skills.map((skill, index) => (
                            <span key={index} className="badge badge-secondary skill-badge">
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      <span className={`badge ${technician.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {technician.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => handleTechnicianEdit(technician)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleTechnicianDelete(technician._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Department Modal */}
      {showDepartmentModal && ReactDOM.createPortal(
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingDepartment ? t('edit') + ' ' + t('department') : t('addDepartment')}
              </h2>
              <button className="modal-close" onClick={closeDepartmentModal}>
                ×
              </button>
            </div>
            
            <form onSubmit={handleDepartmentSubmit}>
              <div className="form-group">
                <label className="form-label">{t('name')} *</label>
                <input
                  type="text"
                  className="form-control"
                  value={departmentFormData.name}
                  onChange={(e) => setDepartmentFormData({...departmentFormData, name: e.target.value})}
                  required
                  placeholder={`${t('name')}...`}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('description')}</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={departmentFormData.description}
                  onChange={(e) => setDepartmentFormData({...departmentFormData, description: e.target.value})}
                  placeholder={`${t('description')}...`}
                />
              </div>

              <div className="form-group">
                <label className="form-label checkbox-label">
                  <input
                    type="checkbox"
                    checked={departmentFormData.isActive}
                    onChange={(e) => setDepartmentFormData({...departmentFormData, isActive: e.target.checked})}
                  />
                  {t('active')}
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeDepartmentModal}>
                  {t('cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingDepartment ? t('update') : t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Technician Modal */}
      {showTechnicianModal && ReactDOM.createPortal(
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingTechnician ? t('edit') + ' ' + t('technician') : t('addTechnician')}
              </h2>
              <button className="modal-close" onClick={closeTechnicianModal}>
                ×
              </button>
            </div>
            
            <form onSubmit={handleTechnicianSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('firstName')} *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={technicianFormData.firstName}
                    onChange={(e) => setTechnicianFormData({...technicianFormData, firstName: e.target.value})}
                    required
                    placeholder={`${t('firstName')}...`}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">{t('lastName')} *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={technicianFormData.lastName}
                    onChange={(e) => setTechnicianFormData({...technicianFormData, lastName: e.target.value})}
                    required
                    placeholder={`${t('lastName')}...`}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('email')} *</label>
                  <input
                    type="email"
                    className="form-control"
                    value={technicianFormData.email}
                    onChange={(e) => setTechnicianFormData({...technicianFormData, email: e.target.value})}
                    required
                    placeholder={`${t('email')}...`}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('phone')}</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={technicianFormData.phone}
                    onChange={(e) => setTechnicianFormData({...technicianFormData, phone: e.target.value})}
                    placeholder={`${t('phone')}...`}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('department')} *</label>
                <select
                  className="form-control"
                  value={technicianFormData.department}
                  onChange={(e) => setTechnicianFormData({...technicianFormData, department: e.target.value})}
                  required
                >
                  <option value="">{t('department')}...</option>
                  {departments.filter(dept => dept.isActive).map(dept => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('skills')}</label>
                <div className="skill-input">
                  <input
                    type="text"
                    className="form-control"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder={`${t('skills')}...`}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                  <button type="button" className="btn btn-sm btn-secondary" onClick={addSkill}>
                    {t('add')}
                  </button>
                </div>
                <div className="skills-list">
                  {technicianFormData.skills.map((skill, index) => (
                    <span key={index} className="badge badge-primary skill-badge">
                      {skill}
                      <button
                        type="button"
                        className="skill-remove"
                        onClick={() => removeSkill(skill)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label checkbox-label">
                  <input
                    type="checkbox"
                    checked={technicianFormData.isActive}
                    onChange={(e) => setTechnicianFormData({...technicianFormData, isActive: e.target.checked})}
                  />
                  {t('active')}
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeTechnicianModal}>
                  {t('cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTechnician ? t('update') : t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

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
              ) : pendingUsers.length === 0 ? (
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
              ) : allUsers.length === 0 ? (
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
                        {/* Row 1: Name - Phone - Email */}
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
                          {!u.email && u.username && (
                            <>
                              <span style={{ margin: '0 8px', color: '#999' }}>•</span>
                              <span style={{ color: '#666', fontStyle: 'italic' }}>Username: {u.username}</span>
                            </>
                          )}
                        </div>
                        
                        {/* Row 2: Role - Status */}
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
                      
                      {/* Action buttons on the right */}
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
                          disabled={(u.email && u.email === user?.email) || (u.username && u.username === user?.username)}
                          title={((u.email && u.email === user?.email) || (u.username && u.username === user?.username)) ? 'Cannot delete yourself' : 'Delete user'}
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

      {/* Settings Modal */}
      {showSettingsModal && ReactDOM.createPortal(
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">📊 System Status</h2>
              <button className="modal-close" onClick={closeSettingsModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {/* System Status Section */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <label className="form-label">System Status</label>
                  <button 
                    className="btn btn-sm" 
                    onClick={checkSystemStatus}
                    disabled={statusLoading}
                    style={{ 
                      padding: '4px 8px', 
                      fontSize: '12px',
                      opacity: statusLoading ? 0.6 : 1 
                    }}
                  >
                    {statusLoading ? '⟳' : '🔄'} Refresh
                  </button>
                </div>
                
                <div style={{ 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '6px', 
                  padding: '12px',
                  backgroundColor: 'var(--card-background)'
                }}>
                  {/* Backend Status */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '8px',
                    fontSize: '14px'
                  }}>
                    <span style={{ marginRight: '8px' }}>{getStatusIcon(systemStatus.backend.status)}</span>
                    <span style={{ fontWeight: '500', marginRight: '8px' }}>Backend:</span>
                    <span style={{ 
                      color: getStatusColor(systemStatus.backend.status),
                      fontWeight: '500',
                      flex: 1 
                    }}>
                      {systemStatus.backend.status === 'connected' ? 'Connected' : 
                       systemStatus.backend.status === 'error' ? 'Error' : 
                       systemStatus.backend.status === 'checking' ? 'Checking...' : 'Disconnected'}
                    </span>
                  </div>
                  
                  {/* Database Status */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    fontSize: '14px'
                  }}>
                    <span style={{ marginRight: '8px' }}>{getStatusIcon(systemStatus.database.status)}</span>
                    <span style={{ fontWeight: '500', marginRight: '8px' }}>Database:</span>
                    <span style={{ 
                      color: getStatusColor(systemStatus.database.status),
                      fontWeight: '500',
                      flex: 1 
                    }}>
                      {systemStatus.database.status === 'connected' ? 'Connected' : 
                       systemStatus.database.status === 'error' ? 'Error' : 
                       systemStatus.database.status === 'checking' ? 'Checking...' : 'Disconnected'}
                    </span>
                  </div>
                  
                  {/* Status Messages */}
                  {(systemStatus.backend.message || systemStatus.database.message) && (
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '12px', 
                      color: 'var(--text-muted)',
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '8px'
                    }}>
                      {systemStatus.backend.message && (
                        <div>Backend: {systemStatus.backend.message}</div>
                      )}
                      {systemStatus.database.message && (
                        <div>Database: {systemStatus.database.message}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tools</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      closeSettingsModal();
                      openColorSettingsModal();
                    }}
                    style={{ flex: '1', minWidth: '140px' }}
                  >
                    🎨 Calendar Colors
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      closeSettingsModal();
                      openConsoleModal();
                    }}
                    style={{ flex: '1', minWidth: '140px' }}
                  >
                    🐛 Console {consoleErrors.length > 0 && <span className="error-badge">{consoleErrors.length}</span>}
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeSettingsModal}>
                {t('cancel')}
              </button>
              <button type="button" className="btn btn-primary" onClick={closeSettingsModal}>
                {t('save')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Color Settings Modal */}
      {showColorSettingsModal && ReactDOM.createPortal(
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">🎨 Calendar Colors</h2>
              <button className="modal-close" onClick={closeColorSettingsModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '20px', color: '#666' }}>
                Customize the colors used for different event types in the calendar.
              </p>
              
              <div className="form-group">
                <label className="form-label">Unassigned Tickets</label>
                <div className="color-picker-group">
                  <input
                    type="color"
                    className="color-picker"
                    value={colorSettings.unassignedTickets}
                    onChange={(e) => handleColorChange('unassignedTickets', e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-control color-input"
                    value={colorSettings.unassignedTickets}
                    onChange={(e) => handleColorChange('unassignedTickets', e.target.value)}
                    placeholder="#e74c3c"
                  />
                  <div 
                    className="color-preview" 
                    style={{ backgroundColor: colorSettings.unassignedTickets }}
                  ></div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Tickets</label>
                <div className="color-picker-group">
                  <input
                    type="color"
                    className="color-picker"
                    value={colorSettings.assignedTickets}
                    onChange={(e) => handleColorChange('assignedTickets', e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-control color-input"
                    value={colorSettings.assignedTickets}
                    onChange={(e) => handleColorChange('assignedTickets', e.target.value)}
                    placeholder="#27ae60"
                  />
                  <div 
                    className="color-preview" 
                    style={{ backgroundColor: colorSettings.assignedTickets }}
                  ></div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Absence</label>
                <div className="color-picker-group">
                  <input
                    type="color"
                    className="color-picker"
                    value={colorSettings.absence}
                    onChange={(e) => handleColorChange('absence', e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-control color-input"
                    value={colorSettings.absence}
                    onChange={(e) => handleColorChange('absence', e.target.value)}
                    placeholder="#e67e22"
                  />
                  <div 
                    className="color-preview" 
                    style={{ backgroundColor: colorSettings.absence }}
                  ></div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Vakt</label>
                <div className="color-picker-group">
                  <input
                    type="color"
                    className="color-picker"
                    value={colorSettings.vakt}
                    onChange={(e) => handleColorChange('vakt', e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-control color-input"
                    value={colorSettings.vakt}
                    onChange={(e) => handleColorChange('vakt', e.target.value)}
                    placeholder="#9b59b6"
                  />
                  <div 
                    className="color-preview" 
                    style={{ backgroundColor: colorSettings.vakt }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={resetColorSettings}>
                Reset to Defaults
              </button>
              <button type="button" className="btn btn-secondary" onClick={closeColorSettingsModal}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={saveColorSettings}>
                Save Colors
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Console Modal */}
      {showConsoleModal && ReactDOM.createPortal(
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '900px', height: '80vh' }}>
            <div className="modal-header">
              <h2 className="modal-title">🐛 Debug Console</h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button className="btn btn-sm btn-secondary" onClick={clearConsoleErrors}>
                  Clear
                </button>
                <button className="btn btn-sm btn-primary" onClick={exportConsoleErrors}>
                  Export
                </button>
                <button className="modal-close" onClick={closeConsoleModal}>
                  ×
                </button>
              </div>
            </div>
            <div className="modal-body" style={{ height: 'calc(100% - 120px)', overflow: 'hidden' }}>
              <div className="console-container">
                <div className="console-header">
                  <span>Total Errors/Warnings: {consoleErrors.length}</span>
                  {consoleErrors.length === 0 && (
                    <span style={{ color: '#28a745', fontWeight: 'bold' }}>✅ No errors detected</span>
                  )}
                </div>
                <div className="console-content">
                  {consoleErrors.length === 0 ? (
                    <div className="console-empty">
                      <p>No errors or warnings to display.</p>
                      <p style={{ fontSize: '0.9rem', color: '#666' }}>
                        This console will capture JavaScript errors, warnings, and exceptions in real-time.
                      </p>
                    </div>
                  ) : (
                    consoleErrors.map(error => (
                      <div 
                        key={error.id} 
                        className={`console-entry console-${error.type}`}
                      >
                        <div className="console-timestamp">{error.timestamp}</div>
                        <div className="console-type">{error.type.toUpperCase()}</div>
                        <div className="console-message">{error.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeConsoleModal}>
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Administrator;
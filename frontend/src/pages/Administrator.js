import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { toast } from 'react-toastify';
import regionService from '../services/regionService';
import { departmentService } from '../services/departmentService';
import { technicianService } from '../services/technicianService';
import { useTranslation } from '../utils/translations';
import { useAuth } from '../contexts/AuthContext';

const Administrator = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('regions');
  const [loading, setLoading] = useState(true);

  // Regions state
  const [regions, setRegions] = useState([]);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [editingRegion, setEditingRegion] = useState(null);
  const [regionFormData, setRegionFormData] = useState({
    name: '',
    description: ''
  });

  // Departments state
  const [departments, setDepartments] = useState([]);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [departmentFormData, setDepartmentFormData] = useState({
    name: '',
    description: '',
    regionId: '',
    isActive: true
  });

  // Technicians state
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

  // Check permissions
  const hasPermission = (permissionName) => {
    return user?.permissions?.[permissionName] === true;
  };

  // Load all data
  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadRegions(),
        loadDepartments(),
        loadTechnicians()
      ]);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  // Region functions
  const loadRegions = async () => {
    try {
      const data = await regionService.getAll();
      setRegions(data);
    } catch (error) {
      console.error('Error loading regions:', error);
      toast.error('Error loading regions');
    }
  };

  const handleCreateRegion = () => {
    setEditingRegion(null);
    setRegionFormData({ name: '', description: '' });
    setShowRegionModal(true);
  };

  const handleEditRegion = (region) => {
    setEditingRegion(region);
    setRegionFormData({
      name: region.name,
      description: region.description || ''
    });
    setShowRegionModal(true);
  };

  const handleSaveRegion = async () => {
    try {
      if (editingRegion) {
        await regionService.update(editingRegion._id, regionFormData);
        toast.success('Region updated successfully');
      } else {
        await regionService.create(regionFormData);
        toast.success('Region created successfully');
      }
      setShowRegionModal(false);
      loadRegions();
    } catch (error) {
      console.error('Error saving region:', error);
      toast.error(error.response?.data?.message || 'Error saving region');
    }
  };

  const handleDeleteRegion = async (regionId) => {
    if (!window.confirm('Are you sure you want to delete this region?')) return;
    
    try {
      await regionService.delete(regionId);
      toast.success('Region deleted successfully');
      loadRegions();
    } catch (error) {
      console.error('Error deleting region:', error);
      toast.error(error.response?.data?.message || 'Error deleting region');
    }
  };

  // Department functions
  const loadDepartments = async () => {
    try {
      const data = await departmentService.getAllUnfiltered();
      setDepartments(data);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast.error('Error loading departments');
    }
  };

  const handleCreateDepartment = () => {
    setEditingDepartment(null);
    setDepartmentFormData({ name: '', description: '', regionId: '', isActive: true });
    setShowDepartmentModal(true);
  };

  const handleEditDepartment = (department) => {
    setEditingDepartment(department);
    setDepartmentFormData({
      name: department.name,
      description: department.description || '',
      regionId: department.regionId?._id || '',
      isActive: department.isActive
    });
    setShowDepartmentModal(true);
  };

  const handleSaveDepartment = async () => {
    try {
      if (editingDepartment) {
        await departmentService.update(editingDepartment._id, departmentFormData);
        toast.success('Department updated successfully');
      } else {
        await departmentService.create(departmentFormData);
        toast.success('Department created successfully');
      }
      setShowDepartmentModal(false);
      loadDepartments();
    } catch (error) {
      console.error('Error saving department:', error);
      toast.error(error.response?.data?.message || 'Error saving department');
    }
  };

  const handleDeleteDepartment = async (departmentId) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    
    try {
      await departmentService.delete(departmentId);
      toast.success('Department deleted successfully');
      loadDepartments();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error(error.response?.data?.message || 'Error deleting department');
    }
  };

  // Technician functions
  const loadTechnicians = async () => {
    try {
      const data = await technicianService.getAllUnfiltered();
      setTechnicians(data);
    } catch (error) {
      console.error('Error loading technicians:', error);
      toast.error('Error loading technicians');
    }
  };

  const handleCreateTechnician = () => {
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

  const handleEditTechnician = (technician) => {
    setEditingTechnician(technician);
    setTechnicianFormData({
      firstName: technician.firstName,
      lastName: technician.lastName,
      email: technician.email,
      phone: technician.phone,
      department: technician.department?._id || '',
      skills: technician.skills || [],
      isActive: technician.isActive
    });
    setShowTechnicianModal(true);
  };

  const handleSaveTechnician = async () => {
    try {
      if (editingTechnician) {
        await technicianService.update(editingTechnician._id, technicianFormData);
        toast.success('Technician updated successfully');
      } else {
        await technicianService.create(technicianFormData);
        toast.success('Technician created successfully');
      }
      setShowTechnicianModal(false);
      loadTechnicians();
    } catch (error) {
      console.error('Error saving technician:', error);
      toast.error(error.response?.data?.message || 'Error saving technician');
    }
  };

  const handleDeleteTechnician = async (technicianId) => {
    if (!window.confirm('Are you sure you want to delete this technician?')) return;
    
    try {
      await technicianService.delete(technicianId);
      toast.success('Technician deleted successfully');
      loadTechnicians();
    } catch (error) {
      console.error('Error deleting technician:', error);
      toast.error(error.response?.data?.message || 'Error deleting technician');
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  if (!hasPermission('viewAdministrator')) {
    return (
      <div className="page-container">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading admin data...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Admin Panel</h1>
      </div>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === 'regions' ? 'active' : ''}`}
          onClick={() => setActiveTab('regions')}
        >
          🌍 Regions
        </button>
        <button 
          className={`admin-tab ${activeTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          🏢 Departments
        </button>
        <button 
          className={`admin-tab ${activeTab === 'technicians' ? 'active' : ''}`}
          onClick={() => setActiveTab('technicians')}
        >
          👤 Technicians
        </button>
      </div>

      {/* Tab Content */}
      <div className="admin-tab-content">
        
        {/* Regions Tab */}
        {activeTab === 'regions' && (
          <div className="regions-tab">
            <div className="admin-tab-header">
              <h2>Manage Regions</h2>
              <button className="btn btn-primary" onClick={handleCreateRegion}>
                + Create Region
              </button>
            </div>
            
            <div className="table-container">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Region</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map(region => {
                    const regionDepartments = departments.filter(d => d.regionId?._id === region._id);
                    return (
                      <tr key={region._id}>
                        <td>{region.name}</td>
                        <td>{region.description || '-'}</td>
                        <td>{regionDepartments.length} departments</td>
                        <td>
                          <span className={`status-badge ${region.isActive ? 'active' : 'inactive'}`}>
                            {region.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-sm btn-secondary mr-2"
                            onClick={() => handleEditRegion(region)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteRegion(region._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <div className="departments-tab">
            <div className="admin-tab-header">
              <h2>Manage Departments</h2>
              <button className="btn btn-primary" onClick={handleCreateDepartment}>
                + Create Department
              </button>
            </div>
            
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Region</th>
                    <th>Description</th>
                    <th>Technicians</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map(department => {
                    const deptTechnicians = technicians.filter(t => t.department?._id === department._id);
                    return (
                      <tr key={department._id}>
                        <td>{department.name}</td>
                        <td>{department.regionId?.name || 'No Region'}</td>
                        <td>{department.description || '-'}</td>
                        <td>{deptTechnicians.length} technicians</td>
                        <td>
                          <span className={`status-badge ${department.isActive ? 'active' : 'inactive'}`}>
                            {department.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-sm btn-secondary mr-2"
                            onClick={() => handleEditDepartment(department)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteDepartment(department._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Technicians Tab */}
        {activeTab === 'technicians' && (
          <div className="technicians-tab">
            <div className="admin-tab-header">
              <h2>Manage Technicians</h2>
              <button className="btn btn-primary" onClick={handleCreateTechnician}>
                + Create Technician
              </button>
            </div>
            
            <div className="table-container">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Department</th>
                    <th>Region</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {technicians.map(technician => {
                    return (
                      <tr key={technician._id}>
                        <td>{technician.firstName} {technician.lastName}</td>
                        <td>{technician.email}</td>
                        <td>{technician.phone}</td>
                        <td>{technician.department?.name || 'No Department'}</td>
                        <td>{technician.department?.regionId?.name || 'No Region'}</td>
                        <td>
                          <span className={`status-badge ${technician.isActive ? 'active' : 'inactive'}`}>
                            {technician.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-sm btn-secondary mr-2"
                            onClick={() => handleEditTechnician(technician)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteTechnician(technician._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Region Modal */}
      {showRegionModal && ReactDOM.createPortal(
        <div className="modal" onClick={() => setShowRegionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingRegion ? 'Edit Region' : 'Create Region'}</h2>
              <button className="modal-close" onClick={() => setShowRegionModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={regionFormData.name}
                  onChange={(e) => setRegionFormData({ ...regionFormData, name: e.target.value })}
                  placeholder="Enter region name"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={regionFormData.description}
                  onChange={(e) => setRegionFormData({ ...regionFormData, description: e.target.value })}
                  placeholder="Enter region description"
                  rows="3"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRegionModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveRegion}>
                {editingRegion ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Department Modal */}
      {showDepartmentModal && ReactDOM.createPortal(
        <div className="modal" onClick={() => setShowDepartmentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingDepartment ? 'Edit Department' : 'Create Department'}</h2>
              <button className="modal-close" onClick={() => setShowDepartmentModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={departmentFormData.name}
                  onChange={(e) => setDepartmentFormData({ ...departmentFormData, name: e.target.value })}
                  placeholder="Enter department name"
                />
              </div>
              <div className="form-group">
                <label>Region</label>
                <select
                  value={departmentFormData.regionId}
                  onChange={(e) => setDepartmentFormData({ ...departmentFormData, regionId: e.target.value })}
                >
                  <option value="">Select a region</option>
                  {regions.filter(r => r.isActive).map(region => (
                    <option key={region._id} value={region._id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={departmentFormData.description}
                  onChange={(e) => setDepartmentFormData({ ...departmentFormData, description: e.target.value })}
                  placeholder="Enter department description"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={departmentFormData.isActive}
                    onChange={(e) => setDepartmentFormData({ ...departmentFormData, isActive: e.target.checked })}
                  />
                  Active
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDepartmentModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveDepartment}>
                {editingDepartment ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Technician Modal */}
      {showTechnicianModal && ReactDOM.createPortal(
        <div className="modal" onClick={() => setShowTechnicianModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTechnician ? 'Edit Technician' : 'Create Technician'}</h2>
              <button className="modal-close" onClick={() => setShowTechnicianModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={technicianFormData.firstName}
                    onChange={(e) => setTechnicianFormData({ ...technicianFormData, firstName: e.target.value })}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={technicianFormData.lastName}
                    onChange={(e) => setTechnicianFormData({ ...technicianFormData, lastName: e.target.value })}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={technicianFormData.email}
                  onChange={(e) => setTechnicianFormData({ ...technicianFormData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={technicianFormData.phone}
                  onChange={(e) => setTechnicianFormData({ ...technicianFormData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="form-group">
                <label>Department</label>
                <select
                  value={technicianFormData.department}
                  onChange={(e) => setTechnicianFormData({ ...technicianFormData, department: e.target.value })}
                >
                  <option value="">Select a department</option>
                  {departments.filter(d => d.isActive).map(department => (
                    <option key={department._id} value={department._id}>
                      {department.name} {department.regionId && `(${department.regionId.name})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={technicianFormData.isActive}
                    onChange={(e) => setTechnicianFormData({ ...technicianFormData, isActive: e.target.checked })}
                  />
                  Active
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowTechnicianModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveTechnician}>
                {editingTechnician ? 'Update' : 'Create'}
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
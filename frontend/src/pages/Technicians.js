import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { technicianService } from '../services/technicianService';
import { departmentService } from '../services/departmentService';
import { useTranslation } from '../utils/translations';

const Technicians = () => {
  const { t } = useTranslation();
  const [technicians, setTechnicians] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    skills: [],
    isActive: true
  });
  const [skillInput, setSkillInput] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [techniciansData, departmentsData] = await Promise.all([
        technicianService.getAll(),
        departmentService.getAll()
      ]);
      setTechnicians(techniciansData);
      setDepartments(departmentsData);
      
      // Set Trondheim as default department filter
      const trondheimDept = departmentsData.find(dept => 
        dept.name.toLowerCase().includes('trondheim')
      );
      if (trondheimDept) {
        setSelectedDepartment(trondheimDept._id);
      }
    } catch (error) {
      toast.error('Error loading data');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingTechnician) {
        await technicianService.update(editingTechnician._id, formData);
        toast.success('Technician updated successfully');
      } else {
        await technicianService.create(formData);
        toast.success('Technician created successfully');
      }
      
      closeModal();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving technician');
    }
  };

  const handleEdit = (technician) => {
    setEditingTechnician(technician);
    setFormData({
      firstName: technician.firstName,
      lastName: technician.lastName,
      email: technician.email,
      phone: technician.phone || '',
      department: technician.department._id,
      skills: technician.skills || [],
      isActive: technician.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
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

  const openCreateModal = () => {
    setEditingTechnician(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      skills: [],
      isActive: true
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTechnician(null);
    setFormData({
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
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()]
      });
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const handleSkillKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const getFilteredTechnicians = () => {
    if (!selectedDepartment) {
      return technicians;
    }
    return technicians.filter(technician => 
      technician.department && technician.department._id === selectedDepartment
    );
  };

  if (loading) {
    return <div className="loading">Loading technicians...</div>;
  }

  console.log('Technicians render - departments:', departments.length, 'selectedDepartment:', selectedDepartment);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('technicians')}</h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          {t('addTechnician')}
        </button>
      </div>

      {/* Department Filter */}
      <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <label className="form-label" style={{ margin: 0, minWidth: '100px', fontWeight: 'bold' }}>
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

      {getFilteredTechnicians().length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>{technicians.length === 0 ? 'No technicians found' : 'No technicians found in selected department'}</h3>
            <p>{technicians.length === 0 ? 'Create your first technician to get started' : 'Try selecting a different department or create a new technician'}</p>
            <button className="btn btn-primary" onClick={openCreateModal}>
              {t('addTechnician')}
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>{t('name')}</th>
                <th>{t('email')}</th>
                <th>{t('phone')}</th>
                <th>{t('department')}</th>
                <th>{t('skills')}</th>
                <th>{t('status')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredTechnicians().map((technician) => (
                <tr key={technician._id}>
                  <td>{technician.fullName}</td>
                  <td>{technician.email}</td>
                  <td>{technician.phone || '-'}</td>
                  <td>{technician.department?.name || 'N/A'}</td>
                  <td>
                    {technician.skills && technician.skills.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {technician.skills.map((skill, index) => (
                          <span 
                            key={index}
                            style={{
                              backgroundColor: '#e3f2fd',
                              color: '#1976d2',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '0.8rem'
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    <span className={`status-badge ${technician.isActive ? 'status-open' : 'status-closed'}`}>
                      {technician.isActive ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-small btn-secondary"
                      onClick={() => handleEdit(technician)}
                      style={{ marginRight: '10px' }}
                    >
                      {t('edit')}
                    </button>
                    <button 
                      className="btn btn-small btn-danger"
                      onClick={() => handleDelete(technician._id)}
                    >
                      {t('delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingTechnician ? 'Edit Technician' : 'Add Technician'}
              </h2>
              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Department *</label>
                <select
                  className="form-control"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.filter(dept => dept.isActive).map((department) => (
                    <option key={department._id} value={department._id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Skills</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    className="form-control"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={handleSkillKeyPress}
                    placeholder="Add a skill and press Enter"
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={addSkill}
                  >
                    Add
                  </button>
                </div>
                
                {formData.skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {formData.skills.map((skill, index) => (
                      <span 
                        key={index}
                        style={{
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#1976d2',
                            cursor: 'pointer',
                            fontSize: '1rem'
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ marginRight: '8px' }}
                  />
                  Active
                </label>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTechnician ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Technicians;
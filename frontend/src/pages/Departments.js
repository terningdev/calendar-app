import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { departmentService } from '../services/departmentService';
import { useTranslation } from '../utils/translations';

const Departments = () => {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true
  });

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const data = await departmentService.getAll();
      setDepartments(data);
    } catch (error) {
      toast.error('Error loading departments');
      console.error('Error loading departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingDepartment) {
        await departmentService.update(editingDepartment._id, formData);
        toast.success('Department updated successfully');
      } else {
        await departmentService.create(formData);
        toast.success('Department created successfully');
      }
      
      setShowModal(false);
      setEditingDepartment(null);
      setFormData({ name: '', description: '', isActive: true });
      loadDepartments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving department');
    }
  };

  const handleEdit = (department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || '',
      isActive: department.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        await departmentService.delete(id);
        toast.success('Department deleted successfully');
        loadDepartments();
      } catch (error) {
        toast.error('Error deleting department');
      }
    }
  };

  const openCreateModal = () => {
    setEditingDepartment(null);
    setFormData({ name: '', description: '', isActive: true });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDepartment(null);
    setFormData({ name: '', description: '', isActive: true });
  };

  if (loading) {
    return <div className="loading">Loading departments...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('departments')}</h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          {t('addDepartment')}
        </button>
      </div>

      {departments.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No departments found</h3>
            <p>Create your first department to get started</p>
            <button className="btn btn-primary" onClick={openCreateModal}>
              {t('addDepartment')}
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>{t('name')}</th>
                <th>{t('description')}</th>
                <th>{t('status')}</th>
                <th>{t('createdAt')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((department) => (
                <tr key={department._id}>
                  <td>{department.name}</td>
                  <td>{department.description || '-'}</td>
                  <td>
                    <span className={`status-badge ${department.isActive ? 'status-open' : 'status-closed'}`}>
                      {department.isActive ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td>{new Date(department.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button 
                      className="btn btn-small btn-secondary"
                      onClick={() => handleEdit(department)}
                      style={{ marginRight: '10px' }}
                    >
                      {t('edit')}
                    </button>
                    <button 
                      className="btn btn-small btn-danger"
                      onClick={() => handleDelete(department._id)}
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
                {editingDepartment ? 'Edit Department' : 'Add Department'}
              </h2>
              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
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
                  {editingDepartment ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
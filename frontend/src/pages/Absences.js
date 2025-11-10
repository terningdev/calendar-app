import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { absenceService } from '../services/absenceService';
import { technicianService } from '../services/technicianService';
import { useTranslation } from '../utils/translations';
import { useRegion } from '../contexts/RegionContext';

const Absences = () => {
  const { t } = useTranslation();
  const { refreshTrigger } = useRegion();
  const [absences, setAbsences] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState(null);
  const [filters, setFilters] = useState({
    technicianId: ''
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [formData, setFormData] = useState({
    technicianId: '',
    startDate: '',
    endDate: '',
    title: '',
    type: 'absence', // 'absence' or 'vakt'
    createdBy: 'System User'
  });

  const loadAbsences = useCallback(async () => {
    try {
      const absencesData = await absenceService.getAll(filters);
      setAbsences(absencesData);
    } catch (error) {
      console.error('Error loading absences:', error);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]); // Add refreshTrigger dependency

  useEffect(() => {
    loadAbsences();
  }, [loadAbsences, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [absencesData, techniciansData] = await Promise.allSettled([
        absenceService.getAll(),
        technicianService.getAll()
      ]);
      
      // Handle resolved/rejected promises safely
      const absences = absencesData.status === 'fulfilled' ? absencesData.value : [];
      const technicians = techniciansData.status === 'fulfilled' ? techniciansData.value : [];
      
      setAbsences(absences);
      setTechnicians(technicians.filter(t => t.isActive));
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
      // Validate form data
      if (!formData.technicianId || !formData.title) {
        toast.error('Technician and Title are required');
        return;
      }
      
      if (!formData.startDate || !formData.endDate) {
        toast.error('Start date and End date are required');
        return;
      }
      
      // Validate date order
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        toast.error('End date must be after or equal to start date');
        return;
      }
      
      if (editingAbsence) {
        await absenceService.update(editingAbsence._id, formData);
        toast.success(`${formData.type === 'vakt' ? 'Vakt' : 'Absence'} updated successfully`);
      } else {
        await absenceService.create(formData);
        toast.success(`${formData.type === 'vakt' ? 'Vakt' : 'Absence'} created successfully`);
      }
      
      closeModal();
      loadAbsences();
    } catch (error) {
      console.error('Error saving absence:', error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        const errorMsg = error.response.data?.message || 'Invalid input data';
        toast.error(errorMsg);
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error(`Failed to save ${formData.type}. Please check your internet connection.`);
      }
    }
  };

  const handleEdit = (absence) => {
    setEditingAbsence(absence);
    setFormData({
      technicianId: absence.technicianId?._id || '',
      title: absence.title,
      type: absence.type || 'absence',
      startDate: new Date(absence.startDate).toISOString().slice(0, 10),
      endDate: new Date(absence.endDate).toISOString().slice(0, 10),
      createdBy: absence.createdBy
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await absenceService.delete(id);
        toast.success('Item deleted successfully');
        loadAbsences();
      } catch (error) {
        toast.error('Error deleting item');
      }
    }
  };

  const openCreateModal = (type = 'absence') => {
    setEditingAbsence(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setFormData({
      technicianId: '',
      title: '',
      type: type,
      startDate: tomorrow.toISOString().slice(0, 10),
      endDate: tomorrow.toISOString().slice(0, 10),
      createdBy: 'System User'
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAbsence(null);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end date
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  };

  const filteredAbsences = absences.filter(absence => {
    if (filters.technicianId && absence.technicianId?._id !== filters.technicianId) {
      return false;
    }
    return true;
  });

  if (loading) {
    return <div className="loading">Loading absences...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{t('absenceVakt')}</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => openCreateModal('absence')}>
            {t('createAbsenceOrVakt')}
          </button>
          {/* Mobile Filter Toggle - moved next to create button */}
          <button 
            className="btn btn-secondary mobile-only mobile-filter-toggle"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
          >
            {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
      </div>

      {/* Desktop Filters */}
      <div className="card desktop-only" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('technician')}</label>
            <select 
              className="form-control"
              name="technicianId"
              value={filters.technicianId}
              onChange={handleFilterChange}
            >
              <option value="">{t('allTechnicians')}</option>
              {technicians.map(tech => (
                <option key={tech._id} value={tech._id}>
                  {tech.fullName} - {tech.department?.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Filter Content */}
      {showMobileFilters && (
        <div className="card mobile-only" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Technician</label>
                <select 
                  className="form-control"
                  name="technicianId"
                  value={filters.technicianId}
                  onChange={handleFilterChange}
                >
                  <option value="">All Technicians</option>
                  {technicians.map(tech => (
                    <option key={tech._id} value={tech._id}>
                      {tech.fullName} - {tech.department?.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}      {/* Absences Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>{t('technician')}</th>
              <th>{t('type')}</th>
              <th>{t('title')}</th>
              <th>{t('startDate')}</th>
              <th>{t('endDate')}</th>
              <th>{t('duration')}</th>
              <th>{t('createdBy')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredAbsences.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">No entries found</td>
              </tr>
            ) : (
              filteredAbsences.map(absence => (
                <tr key={absence._id}>
                  <td>{absence.technicianId?.fullName || 'Unknown'}</td>
                  <td>
                    {absence.type === 'vakt' ? 'Vakt' : 'Absence'}
                  </td>
                  <td>{absence.title}</td>
                  <td>{formatDate(absence.startDate)}</td>
                  <td>{formatDate(absence.endDate)}</td>
                  <td>{calculateDuration(absence.startDate, absence.endDate)}</td>
                  <td>{absence.createdBy}</td>
                  <td>
                    <div className="actions">
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => handleEdit(absence)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(absence._id)}
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingAbsence 
                  ? `Edit ${editingAbsence.type === 'vakt' ? 'Vakt' : 'Absence'}` 
                  : `Create ${formData.type === 'vakt' ? 'Vakt' : 'Absence'}`
                }
              </h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Technician *</label>
                <select
                  className="form-control"
                  value={formData.technicianId}
                  onChange={(e) => setFormData({...formData, technicianId: e.target.value})}
                  required
                >
                  <option value="">Select Technician</option>
                  {technicians.map(tech => (
                    <option key={tech._id} value={tech._id}>
                      {tech.fullName} - {tech.department?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Type *</label>
                <select
                  className="form-control"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  required
                >
                  <option value="absence">Absence</option>
                  <option value="vakt">Vakt</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder={formData.type === 'vakt' ? 'e.g., Night Shift, Weekend Duty' : 'e.g., Vacation, Sick Leave, Personal Day'}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAbsence ? 'Update' : 'Create'} {formData.type === 'vakt' ? 'Vakt' : 'Absence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Absences;
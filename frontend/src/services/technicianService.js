import api from './api';

import { safeLocalStorage } from '../utils/localStorage';

// Helper function to get current region from localStorage
const getCurrentRegionId = () => {
  return safeLocalStorage.getItem('selectedRegionId');
};

export const technicianService = {
  // Get all technicians with optional region filter
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    
    // Add region filter if available and not already specified
    const regionId = getCurrentRegionId();
    if (regionId && !filters.regionId) {
      filters.regionId = regionId;
    }
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });
    
    const response = await api.get(`/technicians?${params.toString()}`);
    return response.data;
  },

  // Get all technicians (without region filter) - for admin use
  getAllUnfiltered: async () => {
    const response = await api.get('/technicians');
    return response.data;
  },

  // Get technician by ID
  getById: async (id) => {
    const response = await api.get(`/technicians/${id}`);
    return response.data;
  },

  // Get technicians by department
  getByDepartment: async (departmentId) => {
    const response = await api.get(`/technicians/department/${departmentId}`);
    return response.data;
  },

  // Create new technician
  create: async (technicianData) => {
    const response = await api.post('/technicians', technicianData);
    return response.data;
  },

  // Update technician
  update: async (id, technicianData) => {
    const response = await api.put(`/technicians/${id}`, technicianData);
    return response.data;
  },

  // Delete technician
  delete: async (id) => {
    const response = await api.delete(`/technicians/${id}`);
    return response.data;
  },
};
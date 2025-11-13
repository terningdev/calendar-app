import api from './api';

import { safeLocalStorage } from '../utils/localStorage';

// Helper function to get current region from localStorage
const getCurrentRegionId = () => {
  return safeLocalStorage.getItem('selectedRegionId');
};

export const departmentService = {
  // Get all departments with optional region filter
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
    
    const response = await api.get(`/departments?${params.toString()}`);
    return response.data;
  },

  // Get all departments (without region filter) - for admin use
  getAllUnfiltered: async () => {
    const response = await api.get('/departments');
    return response.data;
  },

  // Get department by ID
  getById: async (id) => {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  },

  // Create new department
  create: async (departmentData) => {
    const response = await api.post('/departments', departmentData);
    return response.data;
  },

  // Update department
  update: async (id, departmentData) => {
    const response = await api.put(`/departments/${id}`, departmentData);
    return response.data;
  },

  // Delete department
  delete: async (id) => {
    const response = await api.delete(`/departments/${id}`);
    return response.data;
  },
};
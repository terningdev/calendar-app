import api from './api';

import { safeLocalStorage } from '../utils/localStorage';

// Helper function to get current region from localStorage
const getCurrentRegionId = () => {
  return safeLocalStorage.getItem('selectedRegionId');
};

export const absenceService = {
  // Get all absences with optional filters
  getAll: async (filters = {}) => {
    try {
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
      
      const response = await api.get(`/absences?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching absences:', error);
      return [];
    }
  },

  // Get absences for calendar view
  getForCalendar: async (startDate, endDate) => {
    try {
      const params = new URLSearchParams();
      params.append('start', startDate);
      params.append('end', endDate);
      
      // Add region filter if available
      const regionId = getCurrentRegionId();
      if (regionId) {
        params.append('regionId', regionId);
      }
      
      const response = await api.get(`/absences/calendar?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching calendar absences:', error);
      // Return empty array instead of throwing to prevent calendar crashes
      return [];
    }
  },

  // Get absence by ID
  getById: async (id) => {
    const response = await api.get(`/absences/${id}`);
    return response.data;
  },

  // Create new absence
  create: async (absenceData) => {
    const response = await api.post('/absences', absenceData);
    return response.data;
  },

  // Update absence
  update: async (id, absenceData) => {
    const response = await api.put(`/absences/${id}`, absenceData);
    return response.data;
  },

  // Delete absence
  delete: async (id) => {
    const response = await api.delete(`/absences/${id}`);
    return response.data;
  },
};
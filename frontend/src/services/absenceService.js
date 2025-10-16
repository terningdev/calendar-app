import api from './api';

export const absenceService = {
  // Get all absences with optional filters
  getAll: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
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
      const response = await api.get(`/absences/calendar?start=${startDate}&end=${endDate}`);
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
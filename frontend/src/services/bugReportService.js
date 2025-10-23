import api from './api';

const bugReportService = {
  // Get all bug reports (admin only)
  getAll: async () => {
    try {
      const response = await api.get('/bugreports');
      return response.data;
    } catch (error) {
      console.error('Error fetching bug reports:', error);
      throw error;
    }
  },

  // Get count of bug reports
  getCount: async () => {
    try {
      const response = await api.get('/bugreports/count');
      return response.data.count;
    } catch (error) {
      console.error('Error fetching bug reports count:', error);
      throw error;
    }
  },

  // Submit a new bug report
  create: async (message) => {
    try {
      const response = await api.post('/bugreports', { message });
      return response.data;
    } catch (error) {
      console.error('Error submitting bug report:', error);
      throw error;
    }
  },

  // Delete a bug report (admin only)
  delete: async (id) => {
    try {
      const response = await api.delete(`/bugreports/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting bug report:', error);
      throw error;
    }
  }
};

export default bugReportService;

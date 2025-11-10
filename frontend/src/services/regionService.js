import api from './api';

const regionService = {
  // Get all regions
  getAll: async () => {
    try {
      const response = await api.get('/api/regions');
      return response.data;
    } catch (error) {
      console.error('Error fetching regions:', error);
      throw error;
    }
  },

  // Get single region with departments
  getById: async (id) => {
    try {
      const response = await api.get(`/api/regions/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching region:', error);
      throw error;
    }
  },

  // Create new region
  create: async (regionData) => {
    try {
      const response = await api.post('/api/regions', regionData);
      return response.data;
    } catch (error) {
      console.error('Error creating region:', error);
      throw error;
    }
  },

  // Update region
  update: async (id, regionData) => {
    try {
      const response = await api.put(`/api/regions/${id}`, regionData);
      return response.data;
    } catch (error) {
      console.error('Error updating region:', error);
      throw error;
    }
  },

  // Delete region
  delete: async (id) => {
    try {
      const response = await api.delete(`/api/regions/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting region:', error);
      throw error;
    }
  },

  // Get departments in a region
  getDepartments: async (regionId) => {
    try {
      const response = await api.get(`/api/regions/${regionId}/departments`);
      return response.data;
    } catch (error) {
      console.error('Error fetching region departments:', error);
      throw error;
    }
  }
};

export { regionService };
export default regionService;
import api from './api';

export const technicianService = {
  // Get all technicians
  getAll: async () => {
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
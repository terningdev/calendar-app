import api from './api';

const permissionsService = {
  // Get all role permissions
  getAllPermissions: async () => {
    try {
      const response = await api.get('/permissions');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch permissions');
    }
  },

  // Get permissions for a specific role
  getRolePermissions: async (role) => {
    try {
      const response = await api.get(`/permissions/${role}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch role permissions');
    }
  },

  // Update permissions for a specific role
  updateRolePermissions: async (role, permissions) => {
    try {
      const response = await api.put(`/permissions/${role}`, { permissions });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update permissions');
    }
  },

  // Reset permissions to defaults for a specific role
  resetRolePermissions: async (role) => {
    try {
      const response = await api.post(`/permissions/reset/${role}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to reset permissions');
    }
  }
};

export default permissionsService;

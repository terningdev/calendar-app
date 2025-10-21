import api from './api';

const userService = {
  // Get all users
  getAllUsers: async () => {
    try {
      const response = await api.get('/auth/users');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch users' };
    }
  },

  // Update user
  updateUser: async (email, userData) => {
    try {
      const response = await api.put(`/auth/users/${encodeURIComponent(email)}`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update user' };
    }
  },

  // Delete user
  deleteUser: async (email) => {
    try {
      const response = await api.delete(`/auth/users/${encodeURIComponent(email)}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete user' };
    }
  }
};

export default userService;

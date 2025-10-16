import api from './api';

export const statusService = {
  // Check backend and database connection status
  getSystemStatus: async () => {
    try {
      const response = await api.get('/status');
      return response.data;
    } catch (error) {
      console.error('Status check failed:', error);
      return {
        backend: { status: 'disconnected', message: 'Cannot reach backend server' },
        database: { status: 'unknown', message: 'Backend unreachable' }
      };
    }
  }
};